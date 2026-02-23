#!/bin/bash

VM_NAME="server1" 
USERNAME="ubuntu"

echo "Launching the server "

# command is taked from official docs no version is hard coded yet
multipass launch --name $VM_NAME

echo "Creating user"
multipass exec $VM_NAME -- sudo useradd -m -s /bin/bash $USERNAME
multipass exec $VM_NAME -- sudo usermod -aG sudo $USERNAME

echo "Transferring files..."
multipass transfer ./main $VM_NAME:/home/$USERNAME/
multipass transfer ./config.json $VM_NAME:/home/$USERNAME/

echo "Fixing permissions..."
multipass exec $VM_NAME -- sudo chown $USERNAME:$USERNAME /home/$USERNAME/main
multipass exec $VM_NAME -- sudo chmod +x /home/$USERNAME/main

echo "Running binary..."
multipass exec $VM_NAME -- sudo -u $USERNAME /home/$USERNAME/main

echo "Done."
