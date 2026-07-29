package handlers

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/labstack/echo/v5"
)

func GetAllowedPorts(c *echo.Context) error {
	return c.JSON(http.StatusOK, struct{}{})
}

func GetAllowedPortsTestfunc() {
	out := `
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
22/tcp (OpenSSH)           ALLOW IN    Anywhere                  
8000/tcp                   ALLOW IN    Anywhere                  
4096/tcp                   ALLOW IN    Anywhere                  
8080                       ALLOW IN    Anywhere                  
8000                       DENY IN     Anywhere                  
22/tcp (OpenSSH (v6))      ALLOW IN    Anywhere (v6)             
8000/tcp (v6)              ALLOW IN    Anywhere (v6)             
4096/tcp (v6)              ALLOW IN    Anywhere (v6)             
8080 (v6)                  ALLOW IN    Anywhere (v6)             
8000 (v6)                  DENY IN     Anywhere (v6)             
	`

	lines := strings.Split(string(out), "\n")
	re := regexp.MustCompile(`^(\d+)\/(tcp|udp).+(ALLOW|DENY)`)

	for _, line := range lines {
		match := re.FindStringSubmatch(line)
		if len(match) > 2 {
			fmt.Println("Port:", match[1], "Protocol:", match[2], "Action:", match[3])
		}

	}
}
