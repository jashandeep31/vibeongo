package actions

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
)

var toolAuthFiles = []string{
	"/home/_USERNAME_/.fx/auth.json",
	"/home/_USERNAME_/.codex/auth.json",
	"/home/_USERNAME_/.pi/agent/auth.json",
}

const localOpencodeURL = "http://127.0.0.1:4096"

func ClearSecretsBeforeSuspend() error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}

	var errs []error
	errs = append(errs, stopTmuxSessions([]string{"dev"})...)
	errs = append(errs, removeToolAuthFiles()...)
	if store.NewOpencodeWeb().IsRunning() {
		if err := removeOpencodeCredentials(cfg.InstanceConfig.OpencodePassword); err != nil {
			errs = append(errs, err)
		}
	} else {
		fmt.Println("opencode is not running, skipped removing its credentials")
	}
	errs = append(errs, removeGitRemoteCredentials(cfg.Repos)...)
	if err := removeConfigSecrets(); err != nil {
		errs = append(errs, err)
	}
	errs = append(errs, stopTmuxSessions([]string{"ops"})...)

	return errors.Join(errs...)
}

func stopTmuxSessions(names []string) []error {
	var errs []error
	for _, name := range names {
		target := "=" + name
		if err := exec.Command("tmux", "has-session", "-t", target).Run(); err != nil {
			continue
		}

		panes, err := exec.Command("tmux", "list-panes", "-s", "-t", target, "-F", "#{pane_id}").Output()
		if err == nil {
			for _, pane := range strings.Fields(string(panes)) {
				for range 2 {
					_ = exec.Command("tmux", "send-keys", "-t", pane, "C-c").Run()
					time.Sleep(300 * time.Millisecond)
				}
			}
		}

		if err := exec.Command("tmux", "has-session", "-t", target).Run(); err == nil {
			if output, err := exec.Command("tmux", "kill-session", "-t", target).CombinedOutput(); err != nil {
				errs = append(errs, fmt.Errorf("failed to kill tmux session %s: %w: %s", name, err, strings.TrimSpace(string(output))))
				continue
			}
		}
		fmt.Println("stopped tmux session", name)
	}
	return errs
}

func removeToolAuthFiles() []error {
	var errs []error
	for _, path := range toolAuthFiles {
		authPath := utils.ReplaceUsernamePlaceholder(path)
		if err := os.Remove(authPath); err != nil && !errors.Is(err, os.ErrNotExist) {
			errs = append(errs, fmt.Errorf("failed to remove %s: %w", authPath, err))
			continue
		}
		fmt.Println("removed", authPath)
	}
	return errs
}

func removeOpencodeCredentials(password string) error {
	client := &http.Client{Timeout: 10 * time.Second}

	request, err := http.NewRequest(http.MethodGet, localOpencodeURL+"/api/credential", nil)
	if err != nil {
		return err
	}
	request.SetBasicAuth("opencode", password)
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("failed to list opencode credentials: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to list opencode credentials: status %d", response.StatusCode)
	}

	var credentials struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&credentials); err != nil {
		return fmt.Errorf("failed to parse opencode credentials: %w", err)
	}

	var errs []error
	for _, credential := range credentials.Data {
		if credential.ID == "" {
			continue
		}
		deleteRequest, err := http.NewRequest(
			http.MethodDelete,
			localOpencodeURL+"/api/credential/"+url.PathEscape(credential.ID),
			nil,
		)
		if err != nil {
			errs = append(errs, err)
			continue
		}
		deleteRequest.SetBasicAuth("opencode", password)
		deleteResponse, err := client.Do(deleteRequest)
		if err != nil {
			errs = append(errs, fmt.Errorf("failed to remove opencode credential %s: %w", credential.ID, err))
			continue
		}
		deleteResponse.Body.Close()
		if deleteResponse.StatusCode != http.StatusNoContent && deleteResponse.StatusCode != http.StatusOK {
			errs = append(errs, fmt.Errorf("failed to remove opencode credential %s: status %d", credential.ID, deleteResponse.StatusCode))
			continue
		}
	}
	if len(errs) == 0 {
		fmt.Printf("removed %d opencode credentials\n", len(credentials.Data))
	}
	return errors.Join(errs...)
}

func removeGitRemoteCredentials(repos []config.GitRepoConfig) []error {
	var errs []error
	for _, repo := range repos {
		repoPath := filepath.Join(utils.WorkspaceDirectory(), repo.FolderName)
		if _, err := os.Stat(filepath.Join(repoPath, ".git")); err != nil {
			continue
		}
		cmd := exec.Command("git", "-C", repoPath, "remote", "set-url", "origin", gitCloneURL(repo))
		if output, err := cmd.CombinedOutput(); err != nil {
			errs = append(errs, fmt.Errorf("failed to reset git remote for %s: %w: %s", repo.FolderName, err, output))
			continue
		}
		fmt.Println("removed git credentials from", repoPath)
	}
	return errs
}

func removeConfigSecrets() error {
	return config.UpdateConfigFile(func(document map[string]json.RawMessage) error {
		if rawRepos, ok := document["repos"]; ok {
			var repos []map[string]json.RawMessage
			if err := json.Unmarshal(rawRepos, &repos); err != nil {
				return fmt.Errorf("failed to parse repos: %w", err)
			}
			for _, repo := range repos {
				repo["access_token"] = json.RawMessage(`""`)
			}
			encoded, err := json.Marshal(repos)
			if err != nil {
				return fmt.Errorf("failed to encode repos: %w", err)
			}
			document["repos"] = encoded
		}

		if rawPackages, ok := document["packages"]; ok {
			var packages []map[string]json.RawMessage
			if err := json.Unmarshal(rawPackages, &packages); err != nil {
				return fmt.Errorf("failed to parse packages: %w", err)
			}
			for _, projectPackage := range packages {
				var packageConfig map[string]json.RawMessage
				if err := json.Unmarshal(projectPackage["config"], &packageConfig); err != nil || packageConfig == nil {
					continue
				}
				if _, ok := packageConfig["auth_json"]; !ok {
					continue
				}
				var name string
				_ = json.Unmarshal(projectPackage["name"], &name)
				if name == "opencode" {
					packageConfig["auth_json"] = json.RawMessage(`[]`)
				} else {
					packageConfig["auth_json"] = json.RawMessage(`{}`)
				}
				encoded, err := json.Marshal(packageConfig)
				if err != nil {
					return fmt.Errorf("failed to encode package config: %w", err)
				}
				projectPackage["config"] = encoded
			}
			encoded, err := json.Marshal(packages)
			if err != nil {
				return fmt.Errorf("failed to encode packages: %w", err)
			}
			document["packages"] = encoded
		}

		fmt.Println("removed secrets from the vibeongo config")
		return nil
	})
}
