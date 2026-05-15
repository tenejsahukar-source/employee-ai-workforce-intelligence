# Employee AI Workforce Intelligence Platform

## Overview

A production-grade full-stack AI-powered workforce intelligence platform designed to predict employee attrition, analyze workforce risk, monitor employee behavior patterns, and provide enterprise analytics dashboards.

This platform combines:

* Machine Learning
* Deep Learning
* Explainable AI (SHAP)
* FastAPI backend
* React + Tailwind frontend
* JWT Authentication
* PostgreSQL architecture
* Dockerized infrastructure
* Enterprise-grade UI/UX

---

# Features

## Authentication & Security

* JWT Authentication
* Protected Routes
* Role-Based Access Control
* Secure Password Hashing
* Token-based Session Management

## AI & Machine Learning

* Employee Attrition Prediction
* Burnout Prediction
* Employee Performance Prediction
* SHAP Explainability
* Anomaly Detection
* Workforce Segmentation
* Recommendation Engine

## Enterprise Dashboard

* Workforce Analytics
* Risk Distribution Monitoring
* Employee Intelligence Dashboard
* Explainability Reports
* Monitoring & Telemetry
* Prediction History

## Backend Features

* FastAPI REST APIs
* PostgreSQL Integration
* SQLAlchemy ORM
* Alembic Migrations
* Celery Background Tasks
* Redis Task Queue
* Structured Logging
* Exception Handling
* Monitoring APIs

## Frontend Features

* React + TypeScript
* TailwindCSS
* Framer Motion Animations
* Modern Enterprise UI
* Protected Client Routes
* Responsive Dashboard
* Interactive Charts
* Real-time Analytics Views

---

# Tech Stack

## Frontend

* React
* TypeScript
* TailwindCSS
* Framer Motion
* Vite
* Axios
* React Router

## Backend

* FastAPI
* Python
* SQLAlchemy
* PostgreSQL
* Alembic
* Celery
* Redis
* JWT Authentication

## Machine Learning

* Scikit-learn
* XGBoost
* SHAP
* TensorFlow/Keras
* Pandas
* NumPy

---

# Project Structure

```bash
backend/
 ├── app/
 ├── ml/
 ├── routes/
 ├── database/
 ├── auth/
 ├── middleware/
 ├── schemas/
 ├── services/
 └── tasks/

frontend/
 ├── src/
 ├── components/
 ├── pages/
 ├── services/
 ├── layouts/
 ├── routes/
 ├── context/
 └── utils/
```

---

# Installation

## Backend Setup

```bash
cd backend

pip install -r requirements.txt

uvicorn app.main:app --reload
```

Backend runs on:

```bash
http://localhost:8000
```

Swagger Docs:

```bash
http://localhost:8000/docs
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on:

```bash
http://localhost:5173
```

---

# Authentication Flow

1. User registers/login
2. Backend validates credentials
3. JWT token generated
4. Token stored in localStorage
5. Protected routes enabled
6. Dashboard access granted

---

# ML Capabilities

## Attrition Prediction

Predict employee resignation risk using ML models.

## Explainable AI

SHAP-based feature contribution visualization.

## Workforce Monitoring

Enterprise monitoring dashboards for employee analytics.

## Recommendation Engine

AI-powered workforce insights and recommendations.

---

# Future Improvements

* Cloud Deployment
* CI/CD Pipelines
* Kubernetes Deployment
* Real-time WebSocket Analytics
* Advanced BI Dashboards
* Multi-Tenant SaaS Architecture
* OAuth Authentication
* Email Notification System
* HR Workflow Automation

---

# Author

Tenej Sahukar

Computer Science Engineering Student

AI/ML + Full Stack Developer

---

# License

This project is for educational and portfolio purposes.
