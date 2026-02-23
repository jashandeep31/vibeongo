#!/bin/bash

VM_NAME="server" 

multipass stop $VM_NAME

multipass delete $VM_NAME

# removing the server
multipass purge
