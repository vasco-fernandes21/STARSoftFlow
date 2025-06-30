# STARSoftFlow

## Overview
STARSoftFlow is an innovative internal project management platform designed to address the specific needs of the STAR Institute. It streamlines project creation, management, and resource allocation while reducing administrative overhead. Built with cutting-edge technologies, STARSoftFlow ensures efficiency, collaboration, and control in project workflows.

## Features
- **Centralized Repository**: A unified database for easy access to project information.
- **Project Lifecycle Management**: Tools to create, manage, and monitor projects efficiently.
- **Hierarchical Organization**: Supports multi-level project structures (Projects, Workpackages, Tasks, Deliverables).
- **Intuitive Allocation System**: Prevents over-allocation and ensures balanced resource distribution.
- **Excel Import**: Smart import functionality for legacy systems.
- **Real-Time Notifications**: WebSocket-based notifications for seamless updates.
- **User Permissions**: Role-based access control for secure and tailored user experiences.

## Technologies Used
- **Frontend**: Next.js, TypeScript, TailwindCSS, ShadcnUI
- **Backend**: tRPC, Prisma, PostgreSQL
- **Runtime**: Bun
- **Authentication**: Auth.js
- **Real-Time Communication**: WebSockets

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/vasco-fernandes21/STARSoftFlow.git
   ```
2. Navigate to the project directory:
   ```bash
   cd STARSoftFlow
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Set up the database:
   ```bash
   bun prisma migrate dev
   ```
5. Start the development server:
   ```bash
   bun dev
   ```

## Usage
- Access the platform at `http://localhost:3000`.
- Log in using your credentials.
- Explore project creation, resource allocation, and other features.

## Contribution
Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Contact
For questions or feedback, please contact [your email].

---

### About STAR Institute
STAR Institute is a Center for Technology and Innovation focused on the automotive sector and adjacent areas, dedicated to driving innovation and technological development.
