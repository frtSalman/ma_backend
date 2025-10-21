import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
    'postgres://postgres:mert1991@c0gggsok8008kcc0ocsk48so:5432/mertaslandb',
    {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: msg => {
            // You can enable logging for debugging
            console.log(msg);
        },
    }
);

export default sequelize;
