package middleware

import (
	"encoding/base64"
	"net/http"
	"strings"

	"expense-tracker/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func BasicAuth(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Basic ") {
			c.Header("WWW-Authenticate", `Basic realm="expense-tracker"`)
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{
				Status:  401,
				Error:   "Unauthorized",
				Message: "Missing Authorization header",
			})
			return
		}
		payload, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(auth, "Basic "))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Status: 401, Error: "Unauthorized", Message: "Invalid auth encoding"})
			return
		}
		parts := strings.SplitN(string(payload), ":", 2)
		if len(parts) != 2 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Status: 401, Error: "Unauthorized", Message: "Invalid auth format"})
			return
		}
		email, password := parts[0], parts[1]
		var user models.User
		if err := db.Where("email = ?", email).First(&user).Error; err != nil {
			c.Header("WWW-Authenticate", `Basic realm="expense-tracker"`)
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Status: 401, Error: "Unauthorized", Message: "Invalid credentials"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
			c.Header("WWW-Authenticate", `Basic realm="expense-tracker"`)
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Status: 401, Error: "Unauthorized", Message: "Invalid credentials"})
			return
		}
		c.Set("currentUser", user)
		c.Next()
	}
}

func CurrentUser(c *gin.Context) (models.User, bool) {
	v, ok := c.Get("currentUser")
	if !ok {
		return models.User{}, false
	}
	u, ok := v.(models.User)
	return u, ok
}
