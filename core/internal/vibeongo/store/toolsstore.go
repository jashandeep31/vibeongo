package store

import "github.com/jashandeep31/vibeongo/core/internal/vibeongo/store/newstores"

type Tools struct {
	OpenCode             *OpencodeWeb
	T3Code               *T3Code
	TerminalSessionStore *newstores.SessionsStore
}

func NewTools() *Tools {
	tools := &Tools{
		OpenCode:             NewOpencodeWeb(),
		T3Code:               NewT3Code(),
		TerminalSessionStore: newstores.NewSessionsStore(),
	}
	return tools
}
