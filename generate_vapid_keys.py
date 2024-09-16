from py_vapid import Vapid01

vapid = Vapid01()
vapid.generate_keys()

print(f"VAPID_PRIVATE_KEY = '{vapid.private_key.encode().decode('utf-8')}'")
print(f"VAPID_PUBLIC_KEY = '{vapid.public_key.encode().decode('utf-8')}'")
