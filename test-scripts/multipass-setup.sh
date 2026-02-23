#!/bin/bash

VM_NAME="server"
USERNAME="local"

echo "Launching the server..."
multipass launch --name $VM_NAME

echo "Creating user..."
multipass exec $VM_NAME -- sudo useradd -m -s /bin/bash $USERNAME
multipass exec $VM_NAME -- sudo usermod -aG sudo $USERNAME

echo "Allow ubuntu user to write into /home/$USERNAME temporarily..."
multipass exec $VM_NAME -- sudo chmod 777 /home/$USERNAME

echo "Transferring files directly to local home..."
multipass transfer ./bootstrap $VM_NAME:/home/$USERNAME/bootstrap
multipass transfer ./config.json $VM_NAME:/home/$USERNAME/config.json

echo "Restoring proper ownership & permissions..."
multipass exec $VM_NAME -- sudo chown -R $USERNAME:$USERNAME /home/$USERNAME
multipass exec $VM_NAME -- sudo chmod 755 /home/$USERNAME
multipass exec $VM_NAME -- sudo chmod +x /home/$USERNAME/bootstrap

echo "Running bootstrap..."
multipass exec $VM_NAME -- sudo -u $USERNAME /home/$USERNAME/bootstrap

echo "Done."
