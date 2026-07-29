package utils

import "os"

func IntializeOpenCode() {
	_ = "/home/ubuntu/code"

	_ = append(os.Environ(),
		"PATH=/home/ubuntu/.opencode/bin:/usr/local/bin:/usr/bin:/bin",
		"HOME=/home/ubuntu",
	)
}
