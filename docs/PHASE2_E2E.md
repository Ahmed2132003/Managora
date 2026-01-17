# Phase 2 E2E Manual Script

1. Login as Admin.
2. Create a new user with HR role.
3. Assign the HR role from the Users form if it is not already set.
4. Logout.
5. Login as HR.
6. Attempt to access Accounting pages → expect **403 / Access Denied**.
7. Access HR pages → expect **OK**.