package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Email     string    `gorm:"unique;not null" json:"email"`
	Password  string    `gorm:"not null" json:"-"`
	CreatedAt time.Time `gorm:"not null" json:"createdAt"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now().UTC()
	}
	return nil
}

type Category struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string    `gorm:"unique;not null" json:"name"`
	Description *string   `json:"description"`
}

func (c *Category) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

type Expense struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Amount      float64   `gorm:"type:numeric(38,2);not null" json:"amount"`
	Description string    `gorm:"not null" json:"description"`
	Date        time.Time `gorm:"not null" json:"date"`
	CategoryID  uuid.UUID `gorm:"type:uuid;not null" json:"-"`
	UserID      uuid.UUID `gorm:"type:uuid;not null" json:"-"`
	Category    Category  `gorm:"foreignKey:CategoryID" json:"category"`
	User        User      `gorm:"foreignKey:UserID" json:"user"`
}

func (e *Expense) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	if e.Date.IsZero() {
		e.Date = time.Now().UTC()
	}
	return nil
}

// DTOs matching Java records

type CreateUserDto struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UserDto struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}

func ToUserDto(u User) UserDto {
	return UserDto{ID: u.ID, Name: u.Name, Email: u.Email, CreatedAt: u.CreatedAt}
}

type CreateCategoryDto struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
}

type CategoryDto struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
}

func ToCategoryDto(c Category) CategoryDto {
	return CategoryDto{ID: c.ID, Name: c.Name, Description: c.Description}
}

type CreateExpenseDto struct {
	Amount      float64   `json:"amount" binding:"required"`
	Description string    `json:"description" binding:"required"`
	CategoryID  uuid.UUID `json:"categoryId" binding:"required"`
}

type ExpenseDto struct {
	ID          uuid.UUID   `json:"id"`
	Amount      float64     `json:"amount"`
	Description string      `json:"description"`
	Date        time.Time   `json:"date"`
	Category    CategoryDto `json:"category"`
	User        UserDto     `json:"user"`
}

func ToExpenseDto(e Expense) ExpenseDto {
	return ExpenseDto{
		ID: e.ID, Amount: e.Amount, Description: e.Description, Date: e.Date,
		Category: ToCategoryDto(e.Category), User: ToUserDto(e.User),
	}
}

type ErrorResponse struct {
	Timestamp time.Time `json:"timestamp"`
	Status    int       `json:"status"`
	Error     string    `json:"error"`
	Message   string    `json:"message"`
}
