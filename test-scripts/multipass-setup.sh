#!/bin/bash
set -e

VM_NAME="server"
USERNAME="testin_user"
SCRIPT_BINARY="bootstrap-script"

echo "Launching the server..."
multipass launch --name $VM_NAME || echo "VM may already exist"

echo "Creating user..."
multipass exec $VM_NAME -- bash -c \
  "id -u $USERNAME &>/dev/null && echo 'User exists' || sudo useradd -m -s /bin/bash $USERNAME"
multipass exec $VM_NAME -- sudo usermod -aG sudo $USERNAME

# Give passwordless sudo to the new user
multipass exec $VM_NAME -- bash -c \
  "echo '$USERNAME ALL=(ALL) NOPASSWD:ALL' | sudo tee /etc/sudoers.d/$USERNAME"

echo "Transferring files to /tmp first..."
multipass transfer ./$SCRIPT_BINARY $VM_NAME:/tmp/$SCRIPT_BINARY
multipass transfer ./config.json $VM_NAME:/tmp/config.json

echo "Moving files into user home..."
multipass exec $VM_NAME -- sudo mv /tmp/$SCRIPT_BINARY /home/$USERNAME/$SCRIPT_BINARY
multipass exec $VM_NAME -- sudo mv /tmp/config.json /home/$USERNAME/config.json

echo "Fixing ownership & permissions..."
multipass exec $VM_NAME -- sudo chown -R $USERNAME:$USERNAME /home/$USERNAME/
multipass exec $VM_NAME -- sudo chmod 755 /home/$USERNAME
multipass exec $VM_NAME -- sudo chmod +x /home/$USERNAME/$SCRIPT_BINARY

echo "Running bootstrap..."
multipass exec $VM_NAME -- bash -c \
  "cd /home/$USERNAME && sudo ./$SCRIPT_BINARY"

echo "Done."
