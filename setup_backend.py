#!/usr/bin/env python3
"""
Setup script for the Python Forecasting Backend
"""

import subprocess
import sys
import os
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def install_requirements():
    """Install Python requirements"""
    backend_dir = Path("backend")
    requirements_file = backend_dir / "simple_requirements.txt"
    
    if not requirements_file.exists():
        print("❌ simple_requirements.txt not found in backend directory")
        return False
    
    print("📦 Installing Python dependencies...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def test_backend():
    """Test if the backend can start"""
    print("🧪 Testing backend...")
    try:
        # Try to import required modules
        import flask
        print("✅ All required modules imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Missing module: {e}")
        return False

def start_backend():
    """Start the Flask backend"""
    backend_dir = Path("backend")
    app_file = backend_dir / "simple_app.py"
    
    if not app_file.exists():
        print("❌ simple_app.py not found in backend directory")
        return False
    
    print("🚀 Starting Python backend...")
    print("   Backend will be available at: http://localhost:5000")
    print("   Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        subprocess.run([
            sys.executable, str(app_file)
        ], cwd=backend_dir)
    except KeyboardInterrupt:
        print("\n🛑 Backend stopped")
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return False
    
    return True

def main():
    """Main setup function"""
    print("🔧 Python Forecasting Backend Setup")
    print("=" * 40)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install requirements
    if not install_requirements():
        sys.exit(1)
    
    # Test backend
    if not test_backend():
        sys.exit(1)
    
    print("\n✅ Setup completed successfully!")
    print("\nTo start the backend manually:")
    print("   cd backend")
    print("   python simple_app.py")
    print("\nOr run this script again to start the backend automatically.")
    
    # Ask if user wants to start the backend
    response = input("\nStart the backend now? (y/n): ").lower().strip()
    if response in ['y', 'yes']:
        start_backend()

if __name__ == "__main__":
    main() 