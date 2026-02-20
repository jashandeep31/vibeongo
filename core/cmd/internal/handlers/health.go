package handlers

import (
	"net/http"

	"github.com/labstack/echo/v5"
)

type HealthResponse struct {
	Message string `json:"message"`
}

func Health(c *echo.Context) error {
	return c.JSON(http.StatusOK, HealthResponse{
		Message: "Hello world",
	})
}

// 	e := echo.New()
//
// 	e.GET("/", func(c *echo.Context) error {
// 		return c.JSON(http.StatusOK, struct {
// 			Message string    `json:"message"`
// 			Time    time.Time `json:"time"`
// 		}{
// 			Message: "Hello world",
// 			Time:    time.Now(),
// 		})
// 	})
//
// 	if err := e.Start(":8000"); err != nil {
// 		e.Logger.Error("failed to start server", "error", err)
// 	}
// }
