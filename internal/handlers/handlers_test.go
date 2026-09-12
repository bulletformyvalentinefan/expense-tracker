package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"expense-tracker/internal/middleware"
	"expense-tracker/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.Category{}, &models.Expense{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func setupRouter(db *gorm.DB) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := New(db)
	r.POST("/api/auth/register", h.Register)
	r.POST("/api/auth/login", middleware.BasicAuth(db), h.Login)

	api := r.Group("/api")
	api.Use(middleware.BasicAuth(db))
	{
		api.POST("/users", h.CreateUser)
		api.POST("/users/bulk", h.CreateUsersBulk)
		api.GET("/users", h.GetAllUsers)
		api.GET("/users/:id", h.GetUserByID)
		api.DELETE("/users/:id", h.DeleteUser)
		api.POST("/categories", h.CreateCategory)
		api.POST("/categories/bulk", h.CreateCategoriesBulk)
		api.GET("/categories", h.GetAllCategories)
		api.GET("/categories/:id", h.GetCategoryByID)
		api.DELETE("/categories/:id", h.DeleteCategory)
		api.POST("/expenses/:id", h.CreateExpense)
		api.GET("/expenses", h.GetAllExpenses)
		api.GET("/expenses/:id", h.GetExpenseByID)
		api.DELETE("/expenses/:id", h.DeleteExpense)
	}
	r.GET("/health", Health)
	return r
}

func basicAuthHeader(email, pass string) string {
	return "Basic " + base64.StdEncoding.EncodeToString([]byte(email+":"+pass))
}

func TestHealth(t *testing.T) {
	db := setupTestDB(t)
	r := setupRouter(db)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200 got %d body %s", w.Code, w.Body.String())
	}
}

func TestRegisterAndLogin(t *testing.T) {
	db := setupTestDB(t)
	r := setupRouter(db)

	body, _ := json.Marshal(map[string]string{"name": "alice", "email": "alice@test.com", "password": "123456"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("register failed %d %s", w.Code, w.Body.String())
	}
	var u models.UserDto
	if err := json.Unmarshal(w.Body.Bytes(), &u); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if u.Email != "alice@test.com" {
		t.Fatalf("email mismatch")
	}

	// duplicate should 409
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 409 {
		t.Fatalf("expected 409 dup got %d %s", w.Code, w.Body.String())
	}

	// login ok
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/auth/login", nil)
	req.Header.Set("Authorization", basicAuthHeader("alice@test.com", "123456"))
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("login failed %d %s", w.Code, w.Body.String())
	}

	// login wrong pass 401
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/auth/login", nil)
	req.Header.Set("Authorization", basicAuthHeader("alice@test.com", "wrong"))
	r.ServeHTTP(w, req)
	if w.Code != 401 {
		t.Fatalf("expected 401 got %d", w.Code)
	}

	// protected without auth 401
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/users", nil)
	r.ServeHTTP(w, req)
	if w.Code != 401 {
		t.Fatalf("expected 401 protected got %d", w.Code)
	}
}

func TestCategoriesAndExpenses(t *testing.T) {
	db := setupTestDB(t)
	r := setupRouter(db)

	// create user via register
	body, _ := json.Marshal(map[string]string{"name": "bob", "email": "bob@test.com", "password": "123456"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	var bob models.UserDto
	json.Unmarshal(w.Body.Bytes(), &bob)
	auth := basicAuthHeader("bob@test.com", "123456")

	// create category
	catBody, _ := json.Marshal(map[string]string{"name": "Food", "description": "Food"})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/categories", bytes.NewReader(catBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", auth)
	r.ServeHTTP(w, req)
	if w.Code != 201 {
		t.Fatalf("create cat %d %s", w.Code, w.Body.String())
	}
	var cat models.CategoryDto
	json.Unmarshal(w.Body.Bytes(), &cat)

	// get categories
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/categories", nil)
	req.Header.Set("Authorization", auth)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("get cats %d", w.Code)
	}

	// create expense
	expBody, _ := json.Marshal(map[string]interface{}{"amount": 25.5, "description": "Lunch", "categoryId": cat.ID.String()})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/expenses/"+bob.ID.String(), bytes.NewReader(expBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", auth)
	r.ServeHTTP(w, req)
	if w.Code != 201 {
		t.Fatalf("create expense %d %s", w.Code, w.Body.String())
	}
	var exp models.ExpenseDto
	json.Unmarshal(w.Body.Bytes(), &exp)
	if exp.Category.ID != cat.ID || exp.User.ID != bob.ID {
		t.Fatalf("expense relations wrong")
	}

	// list expenses
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/expenses", nil)
	req.Header.Set("Authorization", auth)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("list exp %d", w.Code)
	}
	var exps []models.ExpenseDto
	json.Unmarshal(w.Body.Bytes(), &exps)
	if len(exps) != 1 {
		t.Fatalf("expected 1 exp got %d", len(exps))
	}

	// delete expense
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("DELETE", "/api/expenses/"+exp.ID.String(), nil)
	req.Header.Set("Authorization", auth)
	r.ServeHTTP(w, req)
	if w.Code != 204 {
		t.Fatalf("delete exp %d", w.Code)
	}
}

func TestBulkEndpoints(t *testing.T) {
	db := setupTestDB(t)
	r := setupRouter(db)
	authUser := map[string]string{"name": "admin", "email": "admin@test.com", "password": "123456"}
	b, _ := json.Marshal(authUser)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	auth := basicAuthHeader("admin@test.com", "123456")

	// bulk categories
	bulkCats, _ := json.Marshal([]map[string]string{{"name": "C1"}, {"name": "C2"}})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/categories/bulk", bytes.NewReader(bulkCats))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", auth)
	r.ServeHTTP(w, req)
	if w.Code != 201 {
		t.Fatalf("bulk cats %d %s", w.Code, w.Body.String())
	}

	// bulk users
	bulkUsers, _ := json.Marshal([]map[string]string{{"name": "u1", "email": "u1@test.com", "password": "123456"}, {"name": "u2", "email": "u2@test.com", "password": "123456"}})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/users/bulk", bytes.NewReader(bulkUsers))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", auth)
	r.ServeHTTP(w, req)
	if w.Code != 201 {
		t.Fatalf("bulk users %d %s", w.Code, w.Body.String())
	}
}
