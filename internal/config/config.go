package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DatabaseDSN string
}

func Load() Config {
	// load .env if present (ignore error outside docker)
	_ = godotenv.Load()
	_ = godotenv.Load(".env")
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("SERVER_PORT")
	}
	if port == "" {
		port = "8080"
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_DSN")
	}
	if dsn == "" {
		// fallback discrete vars (no defaults for secrets)
		host := envOr("DB_HOST", "localhost")
		name := envOr("DB_NAME", "expense-tracker")
		portDB := envOr("DB_PORT", "5532")
		user := os.Getenv("DB_USER")
		pass := os.Getenv("DB_PASSWORD")
		if user == "" {
			user = os.Getenv("POSTGRES_USER")
		}
		if pass == "" {
			pass = os.Getenv("POSTGRES_PASSWORD")
		}
		if name == "" {
			name = os.Getenv("POSTGRES_DB")
		}
		if user == "" || pass == "" {
			log.Fatal("DATABASE_URL or DB_USER/DB_PASSWORD (or POSTGRES_USER/POSTGRES_PASSWORD) required — no default secrets")
		}
		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC", host, user, pass, name, portDB)
	}
	return Config{Port: port, DatabaseDSN: dsn}
}

func envOr(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
