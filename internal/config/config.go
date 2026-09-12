package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port     string
	DatabaseDSN string
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("SERVER_PORT")
	}
	if port == "" {
		port = "8080"
	}
	// prefer DATABASE_URL, fallback to SPRING_DATASOURCE_URL (jdbc), then discrete vars
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_DSN")
	}
	if dsn == "" {
		jdbc := os.Getenv("SPRING_DATASOURCE_URL")
		if jdbc != "" {
			dsn = jdbcToDSN(jdbc, os.Getenv("SPRING_DATASOURCE_USERNAME"), os.Getenv("SPRING_DATASOURCE_PASSWORD"))
		}
	}
	if dsn == "" {
		host := envOr("DB_HOST", "localhost")
		user := envOr("SPRING_DATASOURCE_USERNAME", envOr("DB_USER", "postgres"))
		pass := envOr("SPRING_DATASOURCE_PASSWORD", envOr("DB_PASSWORD", "postgres"))
		name := envOr("DB_NAME", "expense-tracker")
		portDB := envOr("DB_PORT", "5532")
		// for docker host=postgres port 5432, for local host=localhost 5532
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

func jdbcToDSN(jdbc, user, pass string) string {
	// jdbc:postgresql://localhost:5532/expense-tracker  -> host=localhost port=5532 dbname=expense-tracker
	s := strings.TrimPrefix(jdbc, "jdbc:")
	// s = postgresql://host:port/db
	// quick parse without net/url to avoid deps
	s = strings.TrimPrefix(s, "postgresql://")
	// split hostPort and db
	parts := strings.SplitN(s, "/", 2)
	hostPort := parts[0]
	dbname := "expense-tracker"
	if len(parts) == 2 {
		dbname = strings.Split(parts[1], "?")[0]
	}
	host := hostPort
	port := "5432"
	if idx := strings.LastIndex(hostPort, ":"); idx != -1 {
		host = hostPort[:idx]
		port = hostPort[idx+1:]
	}
	if user == "" {
		user = "postgres"
	}
	if pass == "" {
		pass = "postgres"
	}
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC", host, user, pass, dbname, port)
}
