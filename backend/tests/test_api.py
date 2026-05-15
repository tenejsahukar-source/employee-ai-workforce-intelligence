"""
Comprehensive test suite for Enterprise API Phase 2
Tests all CRUD operations and authentication scenarios
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from main import app, db, Role, Department

client = TestClient(app)

# ==================== TEST DATA ====================
TEST_ADMIN = {
    "email": "admin@company.com",
    "password": "securepassword123",
    "full_name": "Admin User",
    "role": Role.ADMIN
}

TEST_HR = {
    "email": "hr@company.com",
    "password": "securepassword123",
    "full_name": "HR Manager",
    "role": Role.HR
}

TEST_MANAGER = {
    "email": "manager@company.com",
    "password": "securepassword123",
    "full_name": "Team Manager",
    "role": Role.MANAGER
}

TEST_EMPLOYEE = {
    "email": "employee@company.com",
    "password": "securepassword123",
    "full_name": "Regular Employee",
    "role": Role.EMPLOYEE
}

TEST_EMPLOYEE_DATA = {
    "full_name": "John Doe",
    "email": "john@company.com",
    "phone": "555-0001",
    "department": "engineering",
    "position": "Software Engineer",
    "salary": 95000.0,
    "manager_id": None,
    "hire_date": datetime(2023, 1, 15).isoformat()
}

# ==================== AUTHENTICATION TESTS ====================
class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_register_success(self):
        """Test successful user registration"""
        response = client.post("/register", json=TEST_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_ADMIN["email"]
        assert data["role"] == Role.ADMIN
        assert "id" in data
        assert data["is_active"] is True
    
    def test_register_duplicate_email(self):
        """Test registration with existing email"""
        # First registration
        client.post("/register", json=TEST_ADMIN)
        # Duplicate registration
        response = client.post("/register", json=TEST_ADMIN)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    def test_register_weak_password(self):
        """Test registration with weak password"""
        weak_password = {
            "email": "test@company.com",
            "password": "weak",
            "full_name": "Test User",
            "role": Role.EMPLOYEE
        }
        response = client.post("/register", json=weak_password)
        assert response.status_code == 422
    
    def test_login_success(self):
        """Test successful login"""
        # Register first
        client.post("/register", json=TEST_ADMIN)
        
        # Login
        response = client.post("/login", json={
            "email": TEST_ADMIN["email"],
            "password": TEST_ADMIN["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        # Register first
        client.post("/register", json=TEST_ADMIN)
        
        # Wrong password
        response = client.post("/login", json={
            "email": TEST_ADMIN["email"],
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    def test_login_user_not_found(self):
        """Test login with non-existent user"""
        response = client.post("/login", json={
            "email": "nonexistent@company.com",
            "password": "password123"
        })
        assert response.status_code == 401
    
    def test_refresh_token(self):
        """Test token refresh"""
        # Register and login
        client.post("/register", json=TEST_ADMIN)
        login_response = client.post("/login", json={
            "email": TEST_ADMIN["email"],
            "password": TEST_ADMIN["password"]
        })
        refresh_token = login_response.json()["refresh_token"]
        
        # Refresh
        response = client.post("/refresh", headers={
            "Authorization": f"Bearer {refresh_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

# ==================== EMPLOYEE CRUD TESTS ====================
class TestEmployeeCRUD:
    """Test employee CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data before each test"""
        db.users.clear()
        db.employees.clear()
        
        # Create test users
        client.post("/register", json=TEST_ADMIN)
        client.post("/register", json=TEST_HR)
        client.post("/register", json=TEST_MANAGER)
        client.post("/register", json=TEST_EMPLOYEE)
        
        # Get tokens
        self.admin_token = client.post("/login", json={
            "email": TEST_ADMIN["email"],
            "password": TEST_ADMIN["password"]
        }).json()["access_token"]
        
        self.hr_token = client.post("/login", json={
            "email": TEST_HR["email"],
            "password": TEST_HR["password"]
        }).json()["access_token"]
        
        self.manager_token = client.post("/login", json={
            "email": TEST_MANAGER["email"],
            "password": TEST_MANAGER["password"]
        }).json()["access_token"]
        
        self.employee_token = client.post("/login", json={
            "email": TEST_EMPLOYEE["email"],
            "password": TEST_EMPLOYEE["password"]
        }).json()["access_token"]
    
    def test_create_employee_as_admin(self):
        """Test creating employee as admin"""
        response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["full_name"] == TEST_EMPLOYEE_DATA["full_name"]
        assert data["email"] == TEST_EMPLOYEE_DATA["email"]
        assert "id" in data
        assert data["created_by"] == "user_1"  # Admin is first user
    
    def test_create_employee_as_hr(self):
        """Test creating employee as HR"""
        response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.hr_token}"}
        )
        assert response.status_code == 201
    
    def test_create_employee_as_manager_fails(self):
        """Test that managers cannot create employees"""
        response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.manager_token}"}
        )
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]
    
    def test_create_employee_as_employee_fails(self):
        """Test that employees cannot create employees"""
        response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.employee_token}"}
        )
        assert response.status_code == 403
    
    def test_create_employee_duplicate_email(self):
        """Test creating employee with duplicate email"""
        # Create first employee
        client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        # Try to create another with same email
        response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
    
    def test_get_employees_list(self):
        """Test fetching employees list"""
        # Create employees
        client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        response = client.get(
            "/employees",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["page"] == 1
        assert len(data["data"]) == 1
    
    def test_get_employees_pagination(self):
        """Test pagination"""
        # Create multiple employees
        for i in range(15):
            emp_data = TEST_EMPLOYEE_DATA.copy()
            emp_data["email"] = f"emp{i}@company.com"
            emp_data["full_name"] = f"Employee {i}"
            client.post(
                "/employees",
                json=emp_data,
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
        
        # Get page 1
        response = client.get(
            "/employees?page=1&page_size=10",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        data = response.json()
        assert data["total"] == 15
        assert len(data["data"]) == 10
        
        # Get page 2
        response = client.get(
            "/employees?page=2&page_size=10",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        data = response.json()
        assert len(data["data"]) == 5
    
    def test_get_employees_filter_by_department(self):
        """Test filtering by department"""
        # Create employees with different departments
        emp1 = TEST_EMPLOYEE_DATA.copy()
        emp1["email"] = "eng@company.com"
        emp1["department"] = "engineering"
        
        emp2 = TEST_EMPLOYEE_DATA.copy()
        emp2["email"] = "sales@company.com"
        emp2["department"] = "sales"
        
        client.post("/employees", json=emp1, headers={"Authorization": f"Bearer {self.admin_token}"})
        client.post("/employees", json=emp2, headers={"Authorization": f"Bearer {self.admin_token}"})
        
        # Filter by engineering
        response = client.get(
            "/employees?department=engineering",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        data = response.json()
        assert data["total"] == 1
        assert data["data"][0]["department"] == "engineering"
    
    def test_get_employees_search(self):
        """Test search functionality"""
        client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        # Search by name
        response = client.get(
            "/employees?search=John",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        data = response.json()
        assert data["total"] == 1
        assert "John" in data["data"][0]["full_name"]
    
    def test_get_single_employee(self):
        """Test fetching single employee"""
        # Create employee
        create_response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        emp_id = create_response.json()["id"]
        
        # Get employee
        response = client.get(
            f"/employees/{emp_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == emp_id
        assert data["full_name"] == TEST_EMPLOYEE_DATA["full_name"]
    
    def test_get_employee_not_found(self):
        """Test fetching non-existent employee"""
        response = client.get(
            "/employees/nonexistent",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 404
    
    def test_update_employee_as_admin(self):
        """Test updating employee as admin"""
        # Create employee
        create_response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        emp_id = create_response.json()["id"]
        
        # Update
        update_data = {"salary": 105000.0, "position": "Senior Engineer"}
        response = client.put(
            f"/employees/{emp_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["salary"] == 105000.0
        assert data["position"] == "Senior Engineer"
    
    def test_update_employee_as_manager(self):
        """Test manager updating their direct reports"""
        # Create employee with manager_id
        emp_data = TEST_EMPLOYEE_DATA.copy()
        emp_data["manager_id"] = "user_3"  # Manager user ID
        
        create_response = client.post(
            "/employees",
            json=emp_data,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        emp_id = create_response.json()["id"]
        
        # Manager updates their direct report
        update_data = {"salary": 98000.0}
        response = client.put(
            f"/employees/{emp_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {self.manager_token}"}
        )
        assert response.status_code == 200
    
    def test_update_employee_manager_wrong_report(self):
        """Test manager cannot update others' reports"""
        # Create employee without manager
        create_response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        emp_id = create_response.json()["id"]
        
        # Manager tries to update
        response = client.put(
            f"/employees/{emp_id}",
            json={"salary": 98000.0},
            headers={"Authorization": f"Bearer {self.manager_token}"}
        )
        assert response.status_code == 403
    
    def test_update_employee_duplicate_email(self):
        """Test updating to duplicate email fails"""
        # Create two employees
        emp1_response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        emp2_data = TEST_EMPLOYEE_DATA.copy()
        emp2_data["email"] = "other@company.com"
        emp2_response = client.post(
            "/employees",
            json=emp2_data,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        # Try to update emp2 with emp1's email
        response = client.put(
            f"/employees/{emp2_response.json()['id']}",
            json={"email": TEST_EMPLOYEE_DATA["email"]},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 400
    
    def test_delete_employee_as_admin(self):
        """Test deleting employee as admin"""
        # Create employee
        create_response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        emp_id = create_response.json()["id"]
        
        # Delete
        response = client.delete(
            f"/employees/{emp_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 204
        
        # Verify deleted
        response = client.get(
            f"/employees/{emp_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 404
    
    def test_delete_employee_as_manager_fails(self):
        """Test that managers cannot delete employees"""
        # Create employee
        create_response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        emp_id = create_response.json()["id"]
        
        # Manager tries to delete
        response = client.delete(
            f"/employees/{emp_id}",
            headers={"Authorization": f"Bearer {self.manager_token}"}
        )
        assert response.status_code == 403
    
    def test_delete_employee_not_found(self):
        """Test deleting non-existent employee"""
        response = client.delete(
            "/employees/nonexistent",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 404

# ==================== AUTHORIZATION TESTS ====================
class TestAuthorizationRBAC:
    """Test role-based access control"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        db.users.clear()
        db.employees.clear()
        
        # Create users
        client.post("/register", json=TEST_ADMIN)
        client.post("/register", json=TEST_HR)
        client.post("/register", json=TEST_MANAGER)
        client.post("/register", json=TEST_EMPLOYEE)
        
        # Get tokens
        self.admin_token = client.post("/login", json={
            "email": TEST_ADMIN["email"],
            "password": TEST_ADMIN["password"]
        }).json()["access_token"]
        
        self.employee_token = client.post("/login", json={
            "email": TEST_EMPLOYEE["email"],
            "password": TEST_EMPLOYEE["password"]
        }).json()["access_token"]
    
    def test_unauthorized_access_fails(self):
        """Test accessing endpoints without token"""
        response = client.get("/employees")
        assert response.status_code == 403
    
    def test_invalid_token_fails(self):
        """Test accessing with invalid token"""
        response = client.get(
            "/employees",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401
    
    def test_admin_access_all_endpoints(self):
        """Test admin can access all endpoints"""
        # Create employee
        response = client.post(
            "/employees",
            json=TEST_EMPLOYEE_DATA,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 201

# ==================== HEALTH CHECK TESTS ====================
class TestHealthCheck:
    """Test health and info endpoints"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "2.0.0"
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "docs" in data

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
