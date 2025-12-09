"""
Script to create initial admin user for testing
Run this script to create a test admin user in the database
"""
import asyncio
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from config.database import async_session_maker
from models.it_user_master import ItUserMaster

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_admin_user():
    """Create an admin user for testing"""
    async with async_session_maker() as session:
        # Check if admin user already exists
        result = await session.execute(
            select(ItUserMaster).where(ItUserMaster.user_name == "admin")
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("❌ Admin user already exists!")
            return
        
        # Create admin user
        hashed_password = pwd_context.hash("admin123")
        
        admin_user = ItUserMaster(
            user_name="admin",
            name="System Administrator",
            password=hashed_password,
            user_role="ADMIN",
            status=1,  # Active
        )
        
        session.add(admin_user)
        await session.commit()
        
        print("✅ Admin user created successfully!")
        print("   Username: admin")
        print("   Password: admin123")
        print("   Role: ADMIN")
        print("\n⚠️  Please change this password in production!")


async def create_test_users():
    """Create multiple test users with different roles"""
    async with async_session_maker() as session:
        test_users = [
            {
                "user_name": "admin",
                "name": "System Administrator",
                "password": "admin123",
                "user_role": "ADMIN"
            },
            {
                "user_name": "manager",
                "name": "Branch Manager",
                "password": "manager123",
                "user_role": "BRANCH_MANAGER"
            },
            {
                "user_name": "clerk",
                "name": "Bank Clerk",
                "password": "clerk123",
                "user_role": "CLERK"
            },
        ]
        
        created_count = 0
        
        for user_data in test_users:
            # Check if user already exists
            result = await session.execute(
                select(ItUserMaster).where(ItUserMaster.user_name == user_data["user_name"])
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print(f"⏭️  User '{user_data['user_name']}' already exists, skipping...")
                continue
            
            # Create user
            hashed_password = pwd_context.hash(user_data["password"])
            
            new_user = ItUserMaster(
                user_name=user_data["user_name"],
                name=user_data["name"],
                password=hashed_password,
                user_role=user_data["user_role"],
                status=1,  # Active
            )
            
            session.add(new_user)
            created_count += 1
            print(f"✅ Created user: {user_data['user_name']} ({user_data['user_role']})")
        
        await session.commit()
        
        if created_count > 0:
            print(f"\n✅ Successfully created {created_count} test user(s)!")
            print("\nTest Users:")
            print("=" * 50)
            for user_data in test_users:
                print(f"Username: {user_data['user_name']:15} Password: {user_data['password']:15} Role: {user_data['user_role']}")
            print("=" * 50)
            print("\n⚠️  Please change these passwords in production!")
        else:
            print("\n✅ All test users already exist!")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        print("Creating multiple test users...")
        asyncio.run(create_test_users())
    else:
        print("Creating admin user only...")
        print("(Use --all flag to create multiple test users)")
        asyncio.run(create_admin_user())
