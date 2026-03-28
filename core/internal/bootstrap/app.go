package bootstrap

import (
	"fmt"
	"log"
	"os"
	"os/exec"

	"github.com/fatih/color"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/docker"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/gitrepos"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/nvim"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/opencode"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/scripts"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "vibeongo",
	Short: "",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Please use the subcommands. Like: restart, setup , update etc")
	},
}

var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Update the system",
	Long:  "Update the system",
	Run: func(cmd *cobra.Command, args []string) {
		updateApiServer()
	},
}

var setupCmd = &cobra.Command{
	Use:   "setup",
	Short: "Setup the system",
	Long:  "Used to setup the system from the scratch",
	Run: func(cmd *cobra.Command, args []string) {
		Run()
	},
}

var taskCmd = &cobra.Command{
	Use:   "task",
	Short: "Perform the task",
	Long:  "Perform the task",
	Run: func(cmd *cobra.Command, args []string) {
		PerformTask()
	},
}

func init() {
	rootCmd.AddCommand(updateCmd)
	rootCmd.AddCommand(setupCmd)
	rootCmd.AddCommand(taskCmd)
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func Run() {
	fmt.Println("v0.0.5")
	fmt.Println("")
	color.Cyan("Welcome, We are setting the system up for you")
	color.Yellow("it may take a while")
	fmt.Println("")
	fmt.Println("")

	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		log.Fatalf("config has error %v", err)
	}

	gitrepos.Setup(cfg.Repos)

	if cfg.Docker != nil {
		docker.Setup(cfg.Docker)
	}

	if cfg.OpenCode != nil {
		opencode.Setup(cfg.OpenCode)
	}

	if cfg.Nvim != nil {
		nvim.Setup(cfg.Nvim)
	}

	fmt.Println("writing the bash scripts")
	scripts.WriteScripts()
}

func PerformTask() {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		log.Fatalf("config has error %v", err)
	}
	if cfg.Task == "" {
		fmt.Println("No task to perform")
		return
	}
	opencodeCommand := fmt.Sprintf("/home/ubuntu/.opencode/bin/opencode run %s", cfg.Task)
	cmd := exec.Command("bash", "-c", opencodeCommand)
	cmd.Dir = "/home/ubuntu/code"
	out, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println("Done with the opencode task", string(out))
	fmt.Println("Done with the opencode task")
}
