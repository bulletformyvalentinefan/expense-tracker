package handlers

import (
	"time"

	"expense-tracker/internal/middleware"
	"expense-tracker/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Handler struct {
	DB *gorm.DB
}

func New(db *gorm.DB) *Handler { return &Handler{DB: db} }

func errResp(c *gin.Context, status int, errStr, msg string) {
	c.JSON(status, models.ErrorResponse{Timestamp: time.Now().UTC(), Status: status, Error: errStr, Message: msg})
}

// Auth

func (h *Handler) Register(c *gin.Context) {
	var dto models.CreateUserDto
	if err := c.ShouldBindJSON(&dto); err != nil {
		errResp(c, 400, "Invalid Request Data", err.Error())
		return
	}
	var count int64
	h.DB.Model(&models.User{}).Where("email = ?", dto.Email).Count(&count)
	if count > 0 {
		errResp(c, 409, "Duplicate Entry", "Email already exists")
		return
	}
	h.DB.Model(&models.User{}).Where("name = ?", dto.Name).Count(&count)
	if count > 0 {
		errResp(c, 409, "Duplicate Entry", "Username already exists")
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(dto.Password), bcrypt.DefaultCost)
	user := models.User{Name: dto.Name, Email: dto.Email, Password: string(hash)}
	if err := h.DB.Create(&user).Error; err != nil {
		errResp(c, 500, "Server Error", err.Error())
		return
	}
	c.JSON(200, models.ToUserDto(user))
}

func (h *Handler) Login(c *gin.Context) {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		errResp(c, 401, "Unauthorized", "No active authentication detected")
		return
	}
	c.JSON(200, models.ToUserDto(user))
}

// Users

func (h *Handler) CreateUser(c *gin.Context) {
	var dto models.CreateUserDto
	if err := c.ShouldBindJSON(&dto); err != nil {
		errResp(c, 400, "Invalid Request Data", err.Error())
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(dto.Password), bcrypt.DefaultCost)
	user := models.User{Name: dto.Name, Email: dto.Email, Password: string(hash)}
	if err := h.DB.Create(&user).Error; err != nil {
		if isDup(err) {
			errResp(c, 409, "Duplicate Entry", "Email or username already exists")
			return
		}
		errResp(c, 500, "Server Error", err.Error())
		return
	}
	c.JSON(201, models.ToUserDto(user))
}

func (h *Handler) CreateUsersBulk(c *gin.Context) {
	var dtos []models.CreateUserDto
	if err := c.ShouldBindJSON(&dtos); err != nil {
		errResp(c, 400, "Invalid Request Data", err.Error())
		return
	}
	var result []models.UserDto
	for _, dto := range dtos {
		hash, _ := bcrypt.GenerateFromPassword([]byte(dto.Password), bcrypt.DefaultCost)
		u := models.User{Name: dto.Name, Email: dto.Email, Password: string(hash)}
		if err := h.DB.Create(&u).Error; err != nil {
			errResp(c, 409, "Duplicate Entry", err.Error())
			return
		}
		result = append(result, models.ToUserDto(u))
	}
	c.JSON(201, result)
}

func (h *Handler) GetAllUsers(c *gin.Context) {
	var users []models.User
	h.DB.Find(&users)
	dtos := make([]models.UserDto, 0, len(users))
	for _, u := range users {
		dtos = append(dtos, models.ToUserDto(u))
	}
	c.JSON(200, dtos)
}

func (h *Handler) GetUserByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errResp(c, 400, "Invalid Request Data", "Invalid UUID")
		return
	}
	var u models.User
	if err := h.DB.First(&u, "id = ?", id).Error; err != nil {
		errResp(c, 404, "Resource Not Found", "User not found")
		return
	}
	c.JSON(200, models.ToUserDto(u))
}

func (h *Handler) DeleteUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errResp(c, 400, "Invalid Request Data", "Invalid UUID")
		return
	}
	if err := h.DB.Delete(&models.User{}, "id = ?", id).Error; err != nil {
		errResp(c, 500, "Server Error", err.Error())
		return
	}
	c.Status(200)
}

// Categories

func (h *Handler) CreateCategory(c *gin.Context) {
	var dto models.CreateCategoryDto
	if err := c.ShouldBindJSON(&dto); err != nil {
		errResp(c, 400, "Invalid Request Data", err.Error())
		return
	}
	cat := models.Category{Name: dto.Name, Description: dto.Description}
	if err := h.DB.Create(&cat).Error; err != nil {
		if isDup(err) {
			errResp(c, 409, "Duplicate Entry", "Category name already exists")
			return
		}
		errResp(c, 500, "Server Error", err.Error())
		return
	}
	c.JSON(201, models.ToCategoryDto(cat))
}

func (h *Handler) GetAllCategories(c *gin.Context) {
	var cats []models.Category
	h.DB.Find(&cats)
	dtos := make([]models.CategoryDto, 0, len(cats))
	for _, cat := range cats {
		dtos = append(dtos, models.ToCategoryDto(cat))
	}
	c.JSON(200, dtos)
}

func (h *Handler) GetCategoryByID(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	var cat models.Category
	if err := h.DB.First(&cat, "id = ?", id).Error; err != nil {
		errResp(c, 404, "Resource Not Found", "Category not found")
		return
	}
	c.JSON(200, models.ToCategoryDto(cat))
}

func (h *Handler) DeleteCategory(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	h.DB.Delete(&models.Category{}, "id = ?", id)
	c.Status(204)
}

func (h *Handler) CreateCategoriesBulk(c *gin.Context) {
	var dtos []models.CreateCategoryDto
	if err := c.ShouldBindJSON(&dtos); err != nil {
		errResp(c, 400, "Invalid Request Data", err.Error())
		return
	}
	var cats []models.Category
	for _, d := range dtos {
		cats = append(cats, models.Category{Name: d.Name, Description: d.Description})
	}
	if err := h.DB.Create(&cats).Error; err != nil {
		errResp(c, 409, "Duplicate Entry", err.Error())
		return
	}
	dtosResp := make([]models.CategoryDto, 0, len(cats))
	for _, cat := range cats {
		dtosResp = append(dtosResp, models.ToCategoryDto(cat))
	}
	c.JSON(201, dtosResp)
}

// Expenses

func (h *Handler) CreateExpense(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errResp(c, 400, "Invalid Request Data", "Invalid user UUID")
		return
	}
	var dto models.CreateExpenseDto
	if err := c.ShouldBindJSON(&dto); err != nil {
		errResp(c, 400, "Invalid Request Data", err.Error())
		return
	}
	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		errResp(c, 404, "Resource Not Found", "User not found")
		return
	}
	var cat models.Category
	if err := h.DB.First(&cat, "id = ?", dto.CategoryID).Error; err != nil {
		errResp(c, 404, "Resource Not Found", "Category not found")
		return
	}
	exp := models.Expense{Amount: dto.Amount, Description: dto.Description, CategoryID: cat.ID, UserID: user.ID}
	if err := h.DB.Create(&exp).Error; err != nil {
		errResp(c, 500, "Server Error", err.Error())
		return
	}
	h.DB.Preload("Category").Preload("User").First(&exp, "id = ?", exp.ID)
	c.JSON(201, models.ToExpenseDto(exp))
}

func (h *Handler) GetAllExpenses(c *gin.Context) {
	var exps []models.Expense
	h.DB.Preload("Category").Preload("User").Find(&exps)
	dtos := make([]models.ExpenseDto, 0, len(exps))
	for _, e := range exps {
		dtos = append(dtos, models.ToExpenseDto(e))
	}
	c.JSON(200, dtos)
}

func (h *Handler) GetExpenseByID(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	var e models.Expense
	if err := h.DB.Preload("Category").Preload("User").First(&e, "id = ?", id).Error; err != nil {
		errResp(c, 404, "Resource Not Found", "Expense not found")
		return
	}
	c.JSON(200, models.ToExpenseDto(e))
}

func (h *Handler) DeleteExpense(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	h.DB.Delete(&models.Expense{}, "id = ?", id)
	c.Status(204)
}

func isDup(err error) bool {
	if err == nil {
		return false
	}
	s := err.Error()
	return contains(s, "duplicate") || contains(s, "Unique") || contains(s, "unique") || contains(s, "23505")
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (search(s, substr) != -1)
}

func search(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

// Health

func Health(c *gin.Context) {
	c.JSON(200, gin.H{"status": "ok"})
}
