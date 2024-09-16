from py_vapid import Vapid01

vapid = Vapid01()
vapid.generate_keys()

private_key = vapid.private_key.to_pem().decode('utf-8').strip()
public_key = vapid.public_key.to_pem().decode('utf-8').strip()

print(f"VAPID_PRIVATE_KEY = '{private_key}'")
print(f"VAPID_PUBLIC_KEY = '{public_key}'")
