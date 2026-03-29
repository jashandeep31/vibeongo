package runtimes

import "os/exec"

func NodeJSSetup() {
	script := `#!/usr/bin/env bash
set -e

export NVM_DIR="$HOME/.nvm"

# Install nvm if not present
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
fi

# Load nvm
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Install + set default node
nvm install 24
nvm alias default 24
nvm use default

source $HOME/.nvm/nvm.sh
source $HOME/.bashrc
# Ensure it's active NOW
node -v
npm -v

# Persist for ALL future shells
PROFILE="$HOME/.bashrc"

grep -q 'NVM_DIR' $PROFILE || echo 'export NVM_DIR="$HOME/.nvm"' >> $PROFILE
grep -q 'nvm.sh' $PROFILE || echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> $PROFILE
`

	cmd := exec.Command("bash", "-c", script)
	out, err := cmd.CombinedOutput()
	if err != nil {
		println("Failed to run the setup script", err)
	}
	println(string(out))
}
