package handlers

import (
	"net/http"

	"github.com/labstack/echo/v5"
)

type Handler struct{}

func NewHanlder() *Handler {
	return &Handler{}
}

func (h *Handler) HandleHelloWorld(c *echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"message": "Hello world"})
}
