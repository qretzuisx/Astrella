# Astrella: A web-based apparel selection and reservation system with artificial intelligence recommendation

Astrella is a comprehensive digital platform designed for boutique owners and customers, specifically tailored for gown rentals and apparel management. This project serves as a Capstone Project, focusing on operational efficiency, inventory precision, and an enhanced user experience for garment selection.

---

## Development Team

This project is developed by 3rd-year students of the Bachelor of Science in Information Technology program at the University of the Cordilleras:

1. Espiritu, Rhizalyn T.
2. Licadang, Mheldee Jhoanna D.
3. Manangan, Angel Louraine D.

---

## Core Functionalities

* **Inventory Management**: Precise tracking of gowns and apparel, including categorization, availability status, and detailed specifications.
* **Booking System**: An integrated interface allowing customers to check availability and secure rentals for specific dates.
* **Specialized Dashboards**: Distinct portals for administrators to manage operations and for customers to track their personal booking history.
* **Advanced Image Processing**: Integration with ImageKit for optimized media delivery, alongside automated background removal and facial analysis for personalized garment matching.

---

## Machine Learning Recommendation System

Astrella features a sophisticated recommendation engine that learns and adapts to provide personalized garment suggestions. The system moves beyond simple filters by understanding how different styles complement individual attributes and learning from the collective choices of the community.

### Recommendation Approach

* **Individual Attribute Matching**: The system analyzes how gown characteristics—such as event type, color palette, and fabric texture—align with a user's specific body type, skin tone, and style preferences.
* **Community Insight**: By identifying patterns in booking history, the engine can suggest gowns that have been favored by users with similar stylistic tastes.
* **Popularity and Trends**: The model considers real-world demand, ensuring that frequently booked and highly-rated items are naturally highlighted.
* **Continuous Learning**: The engine is designed to evolve. As more bookings are completed, the system gains a deeper understanding of style trends and user preferences, refining its accuracy over time.

---

## Technology Architecture

### Frontend
* Framework: React.js (Version 19)
* Build Tool: Vite
* Styling: Tailwind CSS
* Routing: React Router
* Interface Logic: Standardized React Hooks and professional motion libraries for smooth transitions.

### Backend
* Runtime Environment: Node.js
* Framework: Express.js
* Database: MongoDB with Mongoose ODM
* Security: JSON Web Tokens (JWT) and Bcrypt encryption
* Media Handling: Multer for uploads, Sharp for image optimization, and ImageKit for global content delivery.

---

## System Installation

### Prerequisites
* Node.js environment
* MongoDB Atlas or a local MongoDB instance
* ImageKit authentication credentials

### Setup Procedure

1. **Repository Acquisition**:
   Clone the repository and navigate to the project root.

2. **Backend Configuration**:
   Navigate to the backend directory, install dependencies, and configure environment variables as required by the system. Start the server using the designated start command.

3. **Frontend Configuration**:
   Navigate to the frontend directory, install necessary packages, and launch the development server.

---

## Project Status
This application was developed as a Capstone Project for academic purposes. All rights and intellectual property remain with the development team.
