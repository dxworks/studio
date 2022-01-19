db.createUser(
    {
        user: 'root',
        pwd: 'rootPass',
        roles: [
            {
                role: 'readWrite',
                db: 'illustry_database',
            },
        ],
    }
)