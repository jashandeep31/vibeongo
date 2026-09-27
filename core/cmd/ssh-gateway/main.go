package main

import (
	"crypto/rand"
	"crypto/rsa"
	"fmt"
	"net"

	"golang.org/x/crypto/ssh"
)

const port = "8002"

func main() {
	fmt.Println("Hello from the ssh-gateway")
	config := &ssh.ServerConfig{
		PasswordCallback: func(c ssh.ConnMetadata, pass []byte) (*ssh.Permissions, error) {
			// Validate user credentials
			if c.User() == "root" && string(pass) == "5" {
				return nil, nil
			}
			return nil, fmt.Errorf("password rejected for %q", c.User())
		},
	}

	// Generate or load a host key and add it
	hostKey, err := generateHostKey()
	if err != nil {
		fmt.Println("Error generating host key:", err)
		return
	}
	config.AddHostKey(hostKey)
	listener, err := net.Listen("tcp", "0.0.0.0:"+port)
	if err != nil {
		fmt.Println("Error listening on port "+port+":", err)
		return
	}

	for {
		conn, err := listener.Accept()
		if err != nil {
			fmt.Println("Error accepting connection:", err)
			continue
		}
		go handleConnection(conn, config)
	}
}

func handleConnection(conn net.Conn, config *ssh.ServerConfig) {
	defer conn.Close()
	sshConn, chans, reqs, err := ssh.NewServerConn(conn, config)
	if err != nil {
		fmt.Println("Failed to handshake:", err)
		return
	}
	defer sshConn.Close()

	go ssh.DiscardRequests(reqs)
	for newChannel := range chans {
		_ = newChannel // handle channels here
	}
}

func generateHostKey() (ssh.Signer, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}
	return ssh.NewSignerFromKey(key)
}
