package main

import (
	"log"
	"net/http"
	"os"

	"expense-tracker/internal/config"
	"expense-tracker/internal/handlers"
	"expense-tracker/internal/middleware"
	"expense-tracker/internal/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg := config.Load()
	log.Printf("Connecting to DB: host=%s dbname=%s (password masked)", envOrMasked("DB_HOST", "POSTGRES_HOST"), envOrMasked("DB_NAME", "POSTGRES_DB"))

	db, err := gorm.Open(postgres.Open(cfg.DatabaseDSN), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect db: %v", err)
	}
	// AutoMigrate keeps existing tables (Hibernate created them). Safe to run.
	if err := db.AutoMigrate(&models.User{}, &models.Category{}, &models.Expense{}); err != nil {
		log.Fatalf("migrate failed: %v", err)
	}
	log.Println("DB migrated")

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// CORS - match previous WebConfig
	corsCfg := cors.DefaultConfig()
	corsCfg.AllowOrigins = []string{"http://localhost:5173", "http://localhost:3000", "http://localhost:80", "http://localhost"}
	corsCfg.AllowOriginFunc = func(origin string) bool { return true }
	corsCfg.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsCfg.AllowHeaders = []string{"*"}
	corsCfg.AllowCredentials = true
	r.Use(cors.New(corsCfg))

	h := handlers.New(db)

	// public
	r.GET("/", handlers.Health)
	r.GET("/health", handlers.Health)
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", h.Register)
		auth.POST("/login", middleware.BasicAuth(db), h.Login)
	}

	// protected (BasicAuth)
	api := r.Group("/api")
	api.Use(middleware.BasicAuth(db))
	{
		// users
		api.POST("/users", h.CreateUser)
		api.POST("/users/bulk", h.CreateUsersBulk)
		api.GET("/users", h.GetAllUsers)
		api.GET("/users/:id", h.GetUserByID)
		api.DELETE("/users/:id", h.DeleteUser)

		// categories
		api.POST("/categories", h.CreateCategory)
		api.POST("/categories/bulk", h.CreateCategoriesBulk)
		api.GET("/categories", h.GetAllCategories)
		api.GET("/categories/:id", h.GetCategoryByID)
		api.DELETE("/categories/:id", h.DeleteCategory)

		// expenses
		api.POST("/expenses/:id", h.CreateExpense)
		api.GET("/expenses", h.GetAllExpenses)
		api.GET("/expenses/:id", h.GetExpenseByID)
		api.DELETE("/expenses/:id", h.DeleteExpense)
	}

	// swagger passthrough not needed

	log.Printf("Listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func envOrMasked(keys ...string) string {
	for _, k := range keys {
		if v := os.Getenv(k); v != "" {
			return v
		}
	}
	return "unknown"
}
