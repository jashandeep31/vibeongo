package utils

import (
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

// MinimumOpenCodeVersion is the runtime release paired with the platform client.
const MinimumOpenCodeVersion = "2.2.0"

var openCodeVersionPattern = regexp.MustCompile(`v?([0-9]+)\.([0-9]+)\.([0-9]+)`)
var minimumOpenCodeVersionParts = [3]int{2, 2, 0}

func OpenCodeVersion(opencodeBin string) ([3]int, error) {
	output, err := exec.Command(opencodeBin, "--version").CombinedOutput()
	if err != nil {
		return [3]int{}, fmt.Errorf("check OpenCode version: %w: %s", err, strings.TrimSpace(string(output)))
	}
	match := openCodeVersionPattern.FindStringSubmatch(string(output))
	if match == nil {
		return [3]int{}, fmt.Errorf("unrecognized OpenCode version: %q", strings.TrimSpace(string(output)))
	}
	var version [3]int
	for index, part := range match[1:] {
		version[index], err = strconv.Atoi(part)
		if err != nil {
			return [3]int{}, fmt.Errorf("parse OpenCode version: %w", err)
		}
	}
	return version, nil
}

func OpenCodeVersionSupported(version [3]int) bool {
	for index, minimum := range minimumOpenCodeVersionParts {
		if version[index] != minimum {
			return version[index] > minimum
		}
	}
	return true
}

func CheckOpenCodeVersion(opencodeBin string) error {
	version, err := OpenCodeVersion(opencodeBin)
	if err != nil {
		return err
	}
	if !OpenCodeVersionSupported(version) {
		return fmt.Errorf("OpenCode %d.%d.%d is below required %s; run vibeongo provision-opencode before starting the server", version[0], version[1], version[2], MinimumOpenCodeVersion)
	}
	return nil
}
