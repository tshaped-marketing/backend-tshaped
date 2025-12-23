const rolesData = {
  roles: [
    {
      name: 'ADMIN',
      permissions: ['create_record', 'read_record', 'update_record', 'delete_record', 'admin_only'],
    },
    {
      name: 'STUDENT',
      permissions: ['read_record'],
    },
  ],
};

export default rolesData;
