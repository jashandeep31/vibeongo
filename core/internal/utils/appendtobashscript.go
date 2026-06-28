package utils

func AppendToBashScript(script *string, cmd string) {
	*script += "\n" + cmd + "\n"
}
