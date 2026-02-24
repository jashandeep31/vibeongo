package docker

import (
	"encoding/json"
	"fmt"
	"slices"
	"sort"
	"strconv"
	"strings"
)

var allowedRestartPolicies = []string{
	"no",
	"always",
	"on-failure",
	"unless-stopped",
}

type image struct {
	Name string `json:"name"`
	Tag  string `json:"tag"`
}

type port struct {
	Host      int `json:"host"`
	Container int `json:"container"`
}

type volume struct {
	Host      string `json:"host"`
	Container string `json:"container"`
}

type container struct {
	Name    string            `json:"name"`
	Image   string            `json:"image"`
	Restart string            `json:"restart"`
	Ports   []port            `json:"ports"`
	Env     map[string]string `json:"env"`
	Volumes []volume          `json:"volumes"`
}

type dockerConfig struct {
	Containers []container `json:"containers"`
}

func configValidator(pkgConfig any) (dockerConfig, error) {
	var cfg dockerConfig

	raw, err := json.Marshal(pkgConfig)
	if err != nil {
		return cfg, fmt.Errorf("failed to encode docker config: %w", err)
	}

	if err := json.Unmarshal(raw, &cfg); err != nil {
		return cfg, fmt.Errorf("failed to decode docker config: %w", err)
	}

	if len(cfg.Containers) == 0 {
		// return cfg, fmt.Errorf("docker config must contain at least one container")
		return cfg, nil
	}

	for i, ctr := range cfg.Containers {
		if strings.TrimSpace(ctr.Name) == "" {
			return cfg, fmt.Errorf("containers[%d].name is required", i)
		}
		if strings.TrimSpace(ctr.Image) == "" {
			return cfg, fmt.Errorf("containers[%d].image is required", i)
		}
		if ctr.Restart != "" && !slices.Contains(allowedRestartPolicies, ctr.Restart) {
			return cfg, fmt.Errorf("containers[%d].restart must be one of %v", i, allowedRestartPolicies)
		}

		for j, p := range ctr.Ports {
			if p.Host <= 0 || p.Container <= 0 {
				return cfg, fmt.Errorf("containers[%d].ports[%d] host/container must be > 0", i, j)
			}
		}

		for j, v := range ctr.Volumes {
			if strings.TrimSpace(v.Host) == "" || strings.TrimSpace(v.Container) == "" {
				return cfg, fmt.Errorf("containers[%d].volumes[%d] host/container is required", i, j)
			}
		}
	}

	return cfg, nil
}

func buildDockerRunCommand(ctr container) string {
	args := []string{
		"docker",
		"run",
		"-d",
		"--name",
		ctr.Name,
	}

	if ctr.Restart != "" {
		args = append(args, "--restart", ctr.Restart)
	}

	for _, p := range ctr.Ports {
		args = append(args, "-p", fmt.Sprintf("%d:%d", p.Host, p.Container))
	}

	envKeys := make([]string, 0, len(ctr.Env))
	for k := range ctr.Env {
		envKeys = append(envKeys, k)
	}
	sort.Strings(envKeys)

	for _, k := range envKeys {
		args = append(args, "-e", fmt.Sprintf("%s=%s", k, ctr.Env[k]))
	}

	for _, v := range ctr.Volumes {
		args = append(args, "-v", fmt.Sprintf("%s:%s", v.Host, v.Container))
	}

	args = append(args, ctr.Image)

	quoted := make([]string, 0, len(args))
	for _, arg := range args {
		quoted = append(quoted, shellQuote(arg))
	}

	return strings.Join(quoted, " ")
}

func shellQuote(arg string) string {
	if arg == "" {
		return "''"
	}

	if strings.ContainsAny(arg, " \t\n\"'\\$`") {
		return strconv.Quote(arg)
	}

	return arg
}
