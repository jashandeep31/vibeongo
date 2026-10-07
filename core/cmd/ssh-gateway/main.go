package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/pem"
	"errors"
	"fmt"
	"log"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
)

const (
	defaultSSHPort       = "8005"
	maxConnections       = 100
	sshHandshakeTimeout  = 25 * time.Second
	sshKeepaliveInterval = 20 * time.Second
)

type grantContextKey struct{}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	envDir, err := loadGatewayEnvironment()
	if err != nil {
		return err
	}
	api, err := newGatewayAPI()
	if err != nil {
		return err
	}
	hostKeyPath := strings.TrimSpace(os.Getenv("SSH_GATEWAY_HOST_KEY_PATH"))
	if hostKeyPath == "" {
		hostKeyPath = filepath.Join(envDir, ".ssh-gateway-host-key")
		if err := createHostKeyIfMissing(hostKeyPath); err != nil {
			return err
		}
	}
	hostKey, err := loadHostKey(hostKeyPath)
	if err != nil {
		return err
	}

	config := &ssh.ServerConfig{
		NoClientAuth: true,
		MaxAuthTries: 1,
		NoClientAuthCallback: func(meta ssh.ConnMetadata) (*ssh.Permissions, error) {
			grant, err := api.authorize(meta.User())
			if err != nil {
				log.Printf("SSH access authorization failed: %v", err)
				return nil, errors.New("invalid or expired SSH access")
			}
			return &ssh.Permissions{ExtraData: map[any]any{grantContextKey{}: grant}}, nil
		},
	}
	config.AddHostKey(hostKey)

	portValue := strings.TrimSpace(os.Getenv("SSH_GATEWAY_PORT"))
	if portValue == "" {
		portValue = defaultSSHPort
	}
	port, err := strconv.Atoi(portValue)
	if err != nil || port < 1 || port > 65535 {
		return errors.New("SSH_GATEWAY_PORT must be a number between 1 and 65535")
	}
	listener, err := net.Listen("tcp", net.JoinHostPort("", portValue))
	if err != nil {
		return fmt.Errorf("listen for SSH connections: %w", err)
	}
	defer listener.Close()
	log.Printf("SSH gateway listening on port %d", port)

	connections := make(chan struct{}, maxConnections)
	for {
		conn, err := listener.Accept()
		if err != nil {
			return fmt.Errorf("accept SSH connection: %w", err)
		}
		select {
		case connections <- struct{}{}:
			go func() {
				defer func() { <-connections }()
				handleConnection(conn, config)
			}()
		default:
			_ = conn.Close()
		}
	}
}

func loadHostKey(path string) (ssh.Signer, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("read SSH host key: %w", err)
	}
	if info.Mode().Perm()&0077 != 0 {
		return nil, errors.New("SSH host key must not be readable by group or others")
	}
	key, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read SSH host key: %w", err)
	}
	signer, err := ssh.ParsePrivateKey(key)
	if err != nil {
		return nil, fmt.Errorf("parse SSH host key: %w", err)
	}
	return signer, nil
}

func createHostKeyIfMissing(path string) error {
	if _, err := os.Stat(path); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("inspect SSH host key: %w", err)
	}
	_, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return fmt.Errorf("generate SSH host key: %w", err)
	}
	block, err := ssh.MarshalPrivateKey(privateKey, "vibeongo ssh gateway")
	if err != nil {
		return fmt.Errorf("serialize SSH host key: %w", err)
	}
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if os.IsExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("create SSH host key: %w", err)
	}
	if _, err := file.Write(pem.EncodeToMemory(block)); err != nil {
		_ = file.Close()
		_ = os.Remove(path)
		return fmt.Errorf("write SSH host key: %w", err)
	}
	if err := file.Close(); err != nil {
		return fmt.Errorf("close SSH host key: %w", err)
	}
	return nil
}

func handleConnection(conn net.Conn, config *ssh.ServerConfig) {
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(sshHandshakeTimeout))
	sshConn, channels, globalRequests, err := ssh.NewServerConn(conn, config)
	if err != nil {
		return
	}
	defer sshConn.Close()
	_ = conn.SetDeadline(time.Time{})

	grant, ok := sshConn.Permissions.ExtraData[grantContextKey{}].(terminalGrant)
	if !ok {
		return
	}
	_ = conn.SetDeadline(grant.ExpiresAt)
	go ssh.DiscardRequests(globalRequests)

	sessionStarted := false
	for newChannel := range channels {
		if newChannel.ChannelType() != "session" || sessionStarted {
			_ = newChannel.Reject(ssh.Prohibited, "only one terminal session is supported")
			continue
		}
		sessionStarted = true
		channel, requests, err := newChannel.Accept()
		if err != nil {
			return
		}
		_ = conn.SetDeadline(time.Time{})
		go func() {
			stopKeepalive := make(chan struct{})
			go keepSSHConnectionAlive(sshConn, stopKeepalive)
			handleSession(channel, requests, grant)
			close(stopKeepalive)
			// Let the SSH client receive channel EOF and exit status before
			// closing the transport. A short deadline still releases idle peers.
			_ = conn.SetReadDeadline(time.Now().Add(5 * time.Second))
		}()
	}
}

func keepSSHConnectionAlive(conn ssh.Conn, stop <-chan struct{}) {
	ticker := time.NewTicker(sshKeepaliveInterval)
	defer ticker.Stop()
	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			if _, _, err := conn.SendRequest("keepalive@openssh.com", false, nil); err != nil {
				return
			}
		}
	}
}
