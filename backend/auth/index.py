"""
Business: User authentication, registration, and login endpoints
Args: event with httpMethod, body, queryStringParameters
Returns: HTTP response with user data or error
"""

import json
import os
import hashlib
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator
import psycopg2
from psycopg2.extras import RealDictCursor

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1, max_length=100)
    
    @field_validator('username')
    def validate_username(cls, v):
        if not v.replace('_', '').isalnum():
            raise ValueError('Username must contain only letters, numbers, and underscores')
        return v.lower()

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    
    @field_validator('username')
    def validate_username(cls, v):
        return v.lower()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    try:
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action', 'login')
            
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            if action == 'register':
                req = RegisterRequest(**body_data)
                password_hash = hash_password(req.password)
                
                cur.execute(
                    "SELECT id FROM users WHERE username = %s",
                    (req.username,)
                )
                if cur.fetchone():
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'isBase64Encoded': False,
                        'body': json.dumps({'error': 'Пользователь с таким именем уже существует'})
                    }
                
                cur.execute(
                    "INSERT INTO users (username, password_hash, full_name, balance) VALUES (%s, %s, %s, %s) RETURNING id, username, full_name, balance",
                    (req.username, password_hash, req.full_name, 10000.00)
                )
                user = cur.fetchone()
                conn.commit()
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'success': True,
                        'user': {
                            'id': user['id'],
                            'username': user['username'],
                            'full_name': user['full_name'],
                            'balance': float(user['balance'])
                        }
                    })
                }
            
            elif action == 'login':
                req = LoginRequest(**body_data)
                password_hash = hash_password(req.password)
                
                cur.execute(
                    "SELECT id, username, full_name, balance FROM users WHERE username = %s AND password_hash = %s",
                    (req.username, password_hash)
                )
                user = cur.fetchone()
                
                cur.close()
                conn.close()
                
                if not user:
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'isBase64Encoded': False,
                        'body': json.dumps({'error': 'Неверное имя пользователя или пароль'})
                    }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'success': True,
                        'user': {
                            'id': user['id'],
                            'username': user['username'],
                            'full_name': user['full_name'],
                            'balance': float(user['balance'])
                        }
                    })
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': str(e)})
        }