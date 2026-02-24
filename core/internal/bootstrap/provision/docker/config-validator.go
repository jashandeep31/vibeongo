package docker

import "fmt"

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

func configValidator(pkgConfig any) {
	cfg, ok := pkgConfig.(dockerConfig)
	if !ok {
		fmt.Println("Failed to get the config")
		return
	}
	fmt.Println(cfg, "cfg ")
}
