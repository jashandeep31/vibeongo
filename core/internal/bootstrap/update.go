package bootstrap

import (
	"bufio"
	"fmt"
	"os/exec"
)

func updateApiServer() {
	fmt.Println("Updating the system")
	cmd := exec.Command("sudo", "bash", "-c", `/home/ubuntu/vibeongo/scripts/update.sh`)
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	cmd.Start()

	scanner := bufio.NewScanner(stdout)
	scanner.Split(bufio.ScanWords)
	for scanner.Scan() {
		m := scanner.Text()
		fmt.Println(m)
	}

	scanner = bufio.NewScanner(stderr)
	for scanner.Scan() {
		m := scanner.Text()
		fmt.Println(m)
	}

	cmd.Wait()
}
