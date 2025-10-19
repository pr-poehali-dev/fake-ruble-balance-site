"""
Business: Handle money transfers and transaction history
Args: event with httpMethod, body, queryStringParameters
Returns: HTTP response with transaction data or history
"""

import json
import os
from typing import Dict, Any
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor
from decimal import Decimal

class TransferRequest(BaseModel):
    from_user_id: int = Field(..., gt=0)
    to_username: str = Field(..., min_length=3)
    amount: Decimal = Field(..., gt=0)
    description: str = Field(default='Перевод')

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
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            user_id = params.get('user_id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'user_id required'})
                }
            
            query = f"""
                SELECT 
                    t.id,
                    t.amount,
                    t.transaction_type,
                    t.description,
                    t.created_at,
                    t.from_user_id,
                    t.to_user_id,
                    u_from.username as from_username,
                    u_from.full_name as from_full_name,
                    u_to.username as to_username,
                    u_to.full_name as to_full_name
                FROM transactions t
                LEFT JOIN users u_from ON t.from_user_id = u_from.id
                LEFT JOIN users u_to ON t.to_user_id = u_to.id
                WHERE t.from_user_id = {int(user_id)} OR t.to_user_id = {int(user_id)}
                ORDER BY t.created_at DESC
                LIMIT 50
            """
            cur.execute(query)
            
            transactions = cur.fetchall()
            cur.close()
            conn.close()
            
            result = []
            for t in transactions:
                result.append({
                    'id': t['id'],
                    'amount': float(t['amount']),
                    'type': t['transaction_type'],
                    'description': t['description'],
                    'date': t['created_at'].isoformat() if t['created_at'] else None,
                    'from_user': {
                        'id': t['from_user_id'],
                        'username': t['from_username'],
                        'full_name': t['from_full_name']
                    } if t['from_user_id'] else None,
                    'to_user': {
                        'id': t['to_user_id'],
                        'username': t['to_username'],
                        'full_name': t['to_full_name']
                    } if t['to_user_id'] else None
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'transactions': result})
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            req = TransferRequest(**body_data)
            
            cur.execute(f"SELECT id, balance FROM users WHERE id = {req.from_user_id}")
            from_user = cur.fetchone()
            
            if not from_user:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Отправитель не найден'})
                }
            
            if from_user['balance'] < req.amount:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Недостаточно средств'})
                }
            
            safe_username = req.to_username.lower().replace("'", "''")
            cur.execute(f"SELECT id FROM users WHERE username = '{safe_username}'")
            to_user = cur.fetchone()
            
            if not to_user:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Получатель не найден'})
                }
            
            if from_user['id'] == to_user['id']:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Нельзя переводить самому себе'})
                }
            
            amount_val = float(req.amount)
            safe_desc = req.description.replace("'", "''")
            
            cur.execute(f"UPDATE users SET balance = balance - {amount_val} WHERE id = {req.from_user_id}")
            cur.execute(f"UPDATE users SET balance = balance + {amount_val} WHERE id = {to_user['id']}")
            
            cur.execute(
                f"INSERT INTO transactions (from_user_id, to_user_id, amount, transaction_type, description) VALUES ({req.from_user_id}, {to_user['id']}, {amount_val}, 'transfer', '{safe_desc}') RETURNING id"
            )
            transaction = cur.fetchone()
            
            cur.execute(f"SELECT balance FROM users WHERE id = {req.from_user_id}")
            new_balance = cur.fetchone()
            
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'transaction_id': transaction['id'],
                    'new_balance': float(new_balance['balance'])
                })
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': str(e)})
        }
