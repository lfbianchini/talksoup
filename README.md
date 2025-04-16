# TalkSoup 🎙️

A modern web application for real-time conversations and discussions.

![TalkSoup Demo](/vids/talksoup.gif)

## 🚀 Tech Stack

### Backend
- Node.js
- Express.js
- Supabase (Database & Authentication)
- CORS enabled
- Environment variables support

### Frontend
- React.js
- Modern UI/UX
- Real-time updates

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm (Node Package Manager)
- Supabase account and project

## 🛠️ Setup Instructions

### Environment Variables

Create a `.env` file in the `backend` directory with the following variables:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The backend server will start on port 3000.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## 🌟 Features

- Real-time communication
- Modern and responsive design
- Secure authentication
- Database persistence
- Cross-origin resource sharing enabled
- Environment configuration support

## 📁 Project Structure

```
talksoup/
├── backend/
│   ├── src/
│   │   └── index.js
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    ├── package.json
    └── public/
```

## 🔧 Available Scripts

### Backend

- `npm start`: Start the production server
- `npm run dev`: Start the development server with auto-reload

### Frontend

- `npm run dev`: Start the development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 