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
	fmt.Println("Hello world from the ssh gateway!")

	// config of ssh Server
	// no authentication we will do this based on the clients username which will act as the token
	config := &ssh.ServerConfig{
		NoClientAuth: true,
	}

	// Adding host key to the server
	// Read this from a single file as restart with the same key will not work
	hostKey, err := generateHostKey()
	fmt.Println(hostKey)
	if err != nil {
		fmt.Println("Error adding host key:", err)
		return
	}
	config.AddHostKey(hostKey)

	// Start listening for incoming connections
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

		// handling the connection in go routine
		go handleConnection(conn, config)
	}
}

// accepting the connection and handling it
func handleConnection(conn net.Conn, config *ssh.ServerConfig) {
	defer conn.Close()

	// creating the ssh connection
	sshConn, chans, reqs, err := ssh.NewServerConn(conn, config)
	if err != nil {
		fmt.Println("Failed to handshake:", err)
		return
	}
	defer sshConn.Close()

	fmt.Println("request from", sshConn.User())

	go ssh.DiscardRequests(reqs)

	for newChannel := range chans {
		// SSH clients normally request a "session" channel
		if newChannel.ChannelType() != "session" {
			newChannel.Reject(
				ssh.UnknownChannelType,
				"unsupported channel type",
			)
			continue
		}
		channel, requests, err := newChannel.Accept()
		if err != nil {
			fmt.Println("Failed to accept channel:", err)
			continue
		}
		go handleSession(channel, requests)
	}
}

func handleSession(channel ssh.Channel, requests <-chan *ssh.Request) {
	defer channel.Close()

	for req := range requests {
		fmt.Println("SSH request:", req.Type)

		switch req.Type {
		case "pty-req":
			fmt.Println("PTY requested")
			req.Reply(true, nil)

		case "shell":
			fmt.Println("Shell requested")
			req.Reply(true, nil)

			// This should immediately appear on SSH client
			_, err := channel.Write([]byte("\r\nWelcome to Vibeongo!\r\n$ "))
			if err != nil {
				fmt.Println("write error:", err)
				return
			}

			// Now read input
			buf := make([]byte, 1024)

			for {
				n, err := channel.Read(buf)
				if err != nil {
					fmt.Println("read error:", err)
					return
				}

				fmt.Printf("received: %q\n", buf[:n])

				// Send it back to SSH client
				_, err = channel.Write(buf[:n])
				if err != nil {
					fmt.Println("write error:", err)
					return
				}
			}

		default:
			fmt.Println("Unknown request:", req.Type)
			req.Reply(false, nil)
		}
	}
}

func readInput(channel ssh.Channel) {
	buffer := make([]byte, 1024)

	for {
		n, err := channel.Read(buffer)
		if err != nil {
			fmt.Println("channel closed:", err)
			return
		}

		input := buffer[:n]

		fmt.Printf("INPUT: %q\n", input)

		// Echo it back to user's terminal
		channel.Write(input)
	}
}

func generateHostKey() (ssh.Signer, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}
	return ssh.NewSignerFromKey(key)
}
