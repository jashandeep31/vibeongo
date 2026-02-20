package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

func Start(startTime time.Time) {
	e := echo.New()
	e.Use(middleware.RequestLogger())

	e.GET("/", func(c *echo.Context) error {
		fmt.Println(time.Now().Year())
		return c.JSON(http.StatusOK, struct {
			Message string    `json:"message"`
			Time    time.Time `json:"time"`
		}{
			Message: "Hello world",
			Time:    startTime,
		})
	})

	if err := e.Start(":8000"); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}
}
