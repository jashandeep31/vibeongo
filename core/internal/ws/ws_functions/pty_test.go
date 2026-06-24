package wsfunctions

import (
	"os"
	"testing"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/store"
)

func TestHandlePTYInputWritesTerminalDataFromTypedMessage(t *testing.T) {
	readFile, writeFile := newPTYInputPipe(t)
	session := &store.TerminalSession{Ptmx: writeFile}

	err := HandlePTYInput(session, []byte(`{"type":"terminal","data":"echo test\r"}`))
	if err != nil {
		t.Fatalf("HandlePTYInput returned error: %v", err)
	}

	got := readPTYInput(t, readFile, len("echo test\r"))
	if got != "echo test\r" {
		t.Fatalf("expected terminal data only, got %q", got)
	}
}

func TestHandlePTYInputWritesRawInputForNonJSONMessages(t *testing.T) {
	readFile, writeFile := newPTYInputPipe(t)
	session := &store.TerminalSession{Ptmx: writeFile}

	err := HandlePTYInput(session, []byte("ls\n"))
	if err != nil {
		t.Fatalf("HandlePTYInput returned error: %v", err)
	}

	got := readPTYInput(t, readFile, len("ls\n"))
	if got != "ls\n" {
		t.Fatalf("expected raw terminal input, got %q", got)
	}
}

func TestHandlePTYInputIgnoresUnknownTypedMessages(t *testing.T) {
	readFile, writeFile := newPTYInputPipe(t)
	session := &store.TerminalSession{Ptmx: writeFile}

	err := HandlePTYInput(session, []byte(`{"type":"unknown","data":"ignored"}`))
	if err != nil {
		t.Fatalf("HandlePTYInput returned error: %v", err)
	}

	if got := readPTYInputWithTimeout(t, readFile, 10*time.Millisecond); got != "" {
		t.Fatalf("expected no PTY input for unknown typed message, got %q", got)
	}
}

func newPTYInputPipe(t *testing.T) (*os.File, *os.File) {
	t.Helper()

	readFile, writeFile, err := os.Pipe()
	if err != nil {
		t.Fatalf("failed to create pipe: %v", err)
	}

	t.Cleanup(func() {
		_ = readFile.Close()
		_ = writeFile.Close()
	})

	return readFile, writeFile
}

func readPTYInput(t *testing.T, file *os.File, expectedLength int) string {
	t.Helper()

	data := make(chan string, 1)
	go func() {
		buf := make([]byte, expectedLength)
		n, _ := file.Read(buf)
		data <- string(buf[:n])
	}()

	select {
	case got := <-data:
		return got
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for PTY input")
		return ""
	}
}

func readPTYInputWithTimeout(t *testing.T, file *os.File, timeout time.Duration) string {
	t.Helper()

	data := make(chan string, 1)
	go func() {
		buf := make([]byte, 1024)
		n, _ := file.Read(buf)
		data <- string(buf[:n])
	}()

	select {
	case got := <-data:
		return got
	case <-time.After(timeout):
		return ""
	}
}
