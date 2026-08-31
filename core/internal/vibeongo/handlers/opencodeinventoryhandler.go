package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"regexp"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
)

var opencodeModelNamePattern = regexp.MustCompile(`^[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+$`)

func OpencodeInventoryHandler(c *echo.Context) error {
	startTime := time.Now()
	opencodeModelsCmd := exec.Command(
		"/home/ubuntu/.opencode/bin/opencode",
		"models",
		"--verbose",
	)
	opencodeModelsCmdOutput, err := opencodeModelsCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("run opencode models --verbose: %w: %s", err, strings.TrimSpace(string(opencodeModelsCmdOutput)))
	}

	lines := strings.Split(string(opencodeModelsCmdOutput), "\n")

	models := []any{}
	var model strings.Builder

	appendModel := func() error {
		rawModel := strings.TrimSpace(model.String())
		if rawModel == "" {
			return nil
		}

		var unmarshaledModel any
		if err := json.Unmarshal([]byte(rawModel), &unmarshaledModel); err != nil {
			return fmt.Errorf("parse OpenCode model: %w", err)
		}

		models = append(models, unmarshaledModel)
		model.Reset()
		return nil
	}

	for _, line := range lines {
		if opencodeModelNamePattern.MatchString(line) {
			if err := appendModel(); err != nil {
				return err
			}
			continue
		}

		model.WriteString(line)
		model.WriteByte('\n')
	}

	if err := appendModel(); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, struct {
		TimeTakenMilliseconds int64 `json:"timeTakenMs"`
		Models                []any `json:"models"`
	}{
		TimeTakenMilliseconds: time.Since(startTime).Milliseconds(),
		Models:                models,
	})
}
