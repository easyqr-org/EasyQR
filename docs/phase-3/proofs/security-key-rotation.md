# Security Key Rotation Proof

## Project
wave1_project

## Create Initial Key
{"projectId":"wave1_project","version":1,"apiKey":"105e94979973f45423802bdfeaf69ad9c4ef23e6e5dbab3675ec866b3dc20c90"}

## Session Auth with Key v1 (Success)
{"sessionId":"3bbe483b-0916-40c7-8f99-b50f48e409b4","wsToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiIzYmJlNDgzYi0wOTE2LTQwYzctOGY5OS1iNTBmNDhlNDA5YjQiLCJwaWQiOiJ3YXZlMV9wcm9qZWN0IiwiaWF0IjoxNzcxOTMyODAyLCJleHAiOjE3NzE5MzM0MDJ9.TqYeQyUXcCEkCQ2CutQjoQ51-R9RdvCy-bk_D1y3c88","desktopUrl":"http://localhost:3000/session/3bbe483b-0916-40c7-8f99-b50f48e409b4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiIzYmJlNDgzYi0wOTE2LTQwYzctOGY5OS1iNTBmNDhlNDA5YjQiLCJwaWQiOiJ3YXZlMV9wcm9qZWN0IiwiaWF0IjoxNzcxOTMyODAyLCJleHAiOjE3NzE5MzM0MDJ9.TqYeQyUXcCEkCQ2CutQjoQ51-R9RdvCy-bk_D1y3c88","mobileUrl":"http://localhost:3000/mobile?sessionId=3bbe483b-0916-40c7-8f99-b50f48e409b4&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiIzYmJlNDgzYi0wOTE2LTQwYzctOGY5OS1iNTBmNDhlNDA5YjQiLCJwaWQiOiJ3YXZlMV9wcm9qZWN0IiwiaWF0IjoxNzcxOTMyODAyLCJleHAiOjE3NzE5MzM0MDJ9.TqYeQyUXcCEkCQ2CutQjoQ51-R9RdvCy-bk_D1y3c88","expiresAt":1771933402200}

## Rotate Key (v2)
{"projectId":"wave1_project","version":2,"apiKey":"13c23f7e2fd7e3d7d52fb14ad06c209dacf73a75f0b9e8f20d83d00dd4d1b631"}

## Old Key v1 After Rotation (Still Valid Before Revoke)
{"sessionId":"a353c28f-a871-4a7a-8567-883601c79ea0","wsToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiJhMzUzYzI4Zi1hODcxLTRhN2EtODU2Ny04ODM2MDFjNzllYTAiLCJwaWQiOiJ3YXZlMV9wcm9qZWN0IiwiaWF0IjoxNzcxOTMyODAyLCJleHAiOjE3NzE5MzM0MDJ9.BEII2Z7vXMO9fSsP0NPlp5VHCYhjDI618_Iyf3v5a3o","desktopUrl":"http://localhost:3000/session/a353c28f-a871-4a7a-8567-883601c79ea0?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiJhMzUzYzI4Zi1hODcxLTRhN2EtODU2Ny04ODM2MDFjNzllYTAiLCJwaWQiOiJ3YXZlMV9wcm9qZWN0IiwiaWF0IjoxNzcxOTMyODAyLCJleHAiOjE3NzE5MzM0MDJ9.BEII2Z7vXMO9fSsP0NPlp5VHCYhjDI618_Iyf3v5a3o","mobileUrl":"http://localhost:3000/mobile?sessionId=a353c28f-a871-4a7a-8567-883601c79ea0&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiJhMzUzYzI4Zi1hODcxLTRhN2EtODU2Ny04ODM2MDFjNzllYTAiLCJwaWQiOiJ3YXZlMV9wcm9qZWN0IiwiaWF0IjoxNzcxOTMyODAyLCJleHAiOjE3NzE5MzM0MDJ9.BEII2Z7vXMO9fSsP0NPlp5VHCYhjDI618_Iyf3v5a3o","expiresAt":1771933402233}

## Revoke Old Key v1
{"projectId":"wave1_project","version":1,"revoked":true}

## Revoked Key v1 (Must Fail)
HTTP/1.1 401 Unauthorized
X-Powered-By: Express
x-request-id: 8b4d7e04-4116-49bd-9507-589d5ead3890
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 139
ETag: W/"8b-tvPhvmljudEa5kO1eogVzGnA4cQ"
Date: Tue, 24 Feb 2026 11:33:22 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":{"code":"INVALID_PROJECT_CREDENTIALS","message":"Invalid project credentials","requestId":"8b4d7e04-4116-49bd-9507-589d5ead3890"}}

## New Key v2 (Must Succeed)
{"sessionId":"12841513-5ba6-49af-8157-913d0c3cec62","wsToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiIxMjg0MTUxMy01YmE2LTQ5YWYtODE1Ny05MTNkMGMzY2VjNjIiLCJwaWQiOiJ3YXZlMV9wcm9qZWN0IiwiaWF0IjoxNzcxOTMyODAyLCJleHAiOjE3NzE5MzM0MDJ9.xDhU5bssxi2MdxK5CtrF1QZbKvEtJZvNHBQ49elSZCk","desktopUrl":"http://localhost:3000/session/12841513-5ba6-49af-8157-913d0c3cec62?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiIxMjg0MTUxMy01YmE2LTQ5YWYtODE1Ny05MTNkMGMzY2VjNjIiLCJwaWQiOiJ3YXZlMV9wcm9qZWN0IiwiaWF0IjoxNzcxOTMyODAyLCJleHAiOjE3NzE5MzM0MDJ9.xDhU5bssxi2MdxK5CtrF1QZbKvEtJZvNHBQ49elSZCk","mobileUrl":"http://localhost:3000/mobile?sessionId=12841513-5ba6-49af-8157-913d0c3cec62&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiIxMjg0MTUxMy01YmE2LTQ5YWYtODE1Ny05MTNkMGMzY2VjNjIiLCJwaWQiOiJ3YXZlMV9wcm9qZWN0IiwiaWF0IjoxNzcxOTMyODAyLCJleHAiOjE3NzE5MzM0MDJ9.xDhU5bssxi2MdxK5CtrF1QZbKvEtJZvNHBQ49elSZCk","expiresAt":1771933402266}
