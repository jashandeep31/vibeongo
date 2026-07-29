package store

type Tools struct {
	OpenCode *OpencodeWeb
	T3Code   *T3Code
}

func NewTools() *Tools {
	tools := &Tools{
		OpenCode: NewOpencodeWeb(),
		T3Code:   NewT3Code(),
	}
	return tools
}
