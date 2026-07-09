package wsfunctions

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

type shellToolsOutput struct {
	Tool   string `json:"tool"`
	Stream string `json:"stream"`
	Output string `json:"output"`
}

func ShellToolsHandler(ctx context.Context, conn *websocket.Conn, writeMu *sync.Mutex, msg []byte, errorSender func(string)) error {
	var parsedData struct {
		Tool   string `json:"tool"`
		Action string `json:"action"`
	}
	if err := json.Unmarshal(msg, &parsedData); err != nil {
		errorSender("invalid shelltools message")
		return nil
	}

	if parsedData.Tool == "moshi" {
		writeShellToolsOutput := func(stream string, output string) {
			writeMu.Lock()
			defer writeMu.Unlock()

			if err := conn.WriteJSON(struct {
				Type string           `json:"type"`
				Data shellToolsOutput `json:"data"`
			}{
				Type: "shelltools",
				Data: shellToolsOutput{
					Tool:   "moshi",
					Stream: stream,
					Output: output,
				},
			}); err != nil {
				log.Printf("shelltools write error: %v", err)
			}
		}

		go func() {
			cfg, err := config.LoadAndValidate()
			if err != nil {
				errorSender(err.Error())
				return
			}

			moshiCmd := utils.ExecCommand(
				utils.SudoUbuntuLoginShell,
				fmt.Sprintf("moshi-hook host setup --host %s --name test", cfg.PublicIP),
			)

			stdout, err := moshiCmd.StdoutPipe()
			if err != nil {
				errorSender(err.Error())
				return
			}

			stderr, err := moshiCmd.StderrPipe()
			if err != nil {
				errorSender(err.Error())
				return
			}

			if err := moshiCmd.Start(); err != nil {
				errorSender(err.Error())
				return
			}

			writeShellToolsOutput("status", "Starting Moshi...")

			var scanWG sync.WaitGroup
			scanWG.Add(2)

			go func() {
				defer scanWG.Done()
				scanner := bufio.NewScanner(stdout)
				for scanner.Scan() {
					writeShellToolsOutput("stdout", scanner.Text())
				}
				if err := scanner.Err(); err != nil {
					log.Printf("stdout scanner error: %v", err)
					errorSender(err.Error())
				}
			}()

			go func() {
				defer scanWG.Done()
				scanner := bufio.NewScanner(stderr)
				for scanner.Scan() {
					writeShellToolsOutput("stderr", scanner.Text())
				}
				if err := scanner.Err(); err != nil {
					log.Printf("stderr scanner error: %v", err)
					errorSender(err.Error())
				}
			}()

			err = moshiCmd.Wait()
			scanWG.Wait()
			if err != nil {
				errorSender(err.Error())
				return
			}

			writeShellToolsOutput("status", "Moshi setup finished")
		}()
		return nil
	}
	return nil

}
