package store

import "github.com/jashandeep31/vibeongo/core/internal/vibeongo/store/newstores"

type Tools struct {
	OpenCode             *OpencodeWeb
	T3Code               *T3Code
	TerminalSessionStore *newstores.SessionsStore
	AuthTokenStore       *AuthTokenStore
}

func NewTools() *Tools {
	tools := &Tools{
		OpenCode:             NewOpencodeWeb(),
		T3Code:               NewT3Code(),
		TerminalSessionStore: newstores.NewSessionsStore(),
		AuthTokenStore:       NewAuthTokenStore(),
	}
	return tools
}
