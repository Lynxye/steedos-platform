/*
 * @Author: sunhaolin@hotoa.com
 * @Date: 2023-03-23 15:12:14
 * @LastEditors: sunhaolin@hotoa.com
 * @LastEditTime: 2023-06-15 13:50:16
 * @Description: 
 */
"use strict";
// @ts-check
const serviceObjectMixin = require('@steedos/service-object-mixin');
const { QUERY_DOCS_TOP } = require('./consts')
const _ = require('lodash')
const { getObject } = require('@steedos/objectql');

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
module.exports = {
    name: 'rest',
    namespace: "steedos",
    mixins: [serviceObjectMixin],

    /**
     * Settings
     */
    settings: {
        // Base path
        rest: "/rest",
    },

    /**
     * Dependencies
     */
    dependencies: [],

    /**
     * Actions
     */
    actions: {
        health: {
            rest: {
                method: "GET",
                path: "/health"
            },
            async handler(ctx) {
                return 'ok'
            }
        },
        /**
         * @api {POST} /api/v1/rest/:objectName/listRecords 获取列表
         * @apiVersion 0.0.0
         * @apiName find
         * @apiGroup @steedos/service-rest
         * @apiParam {String} objectName 对象API Name，如：contracts
         * @apiBody {String[]} [fields] 字段名，如：["name", "description"]
         * @apiBody {Object[]} [filters] 过滤条件，如：[['name', '=', 'test'],['amount', '>', 100]]
         * @apiBody {Number} [top] 获取条数，如：10，最多5000
         * @apiBody {Number} [skip] 跳过条数，如：10
         * @apiBody {String} [sort] 排序，如：'name desc'
         * @apiSuccess {Object[]} listRecords  记录列表
         * @apiSuccessExample {json} Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *      records: [{
         *       "_id": "5e7d1b9b9c9d4400001d1b9b",
         *       "name": "test",
         *       ...
         *      }]
         *     }
         * @apiErrorExample {json} Error-Response:
         *     HTTP/1.1 404 Error
         *     {
         *       "error": "Service 'rest.contracts' is not found.",
         *       "detail": {
         *         "code": "404",
         *         "type": "SERVICE_NOT_FOUND",
         *         "data": {
         *          "action": "rest.contracts"
         *         }
         *       }
         *     }
         */
        find: {
            rest: {
                method: "POST",
                path: "/:objectName/listRecords"
            },
            params: {
                objectName: { type: "string" },
                fields: { type: 'array', items: "string", optional: true },
                filters: [{ type: 'array', optional: true }, { type: 'string', optional: true }],
                top: { type: 'number', optional: true },
                skip: { type: 'number', optional: true },
                sort: { type: 'string', optional: true }
            },
            async handler(ctx) {
                const params = ctx.params
                const { objectName } = params
                const userSession = ctx.meta.user;

                if (_.has(params, "top")) { // 如果top小于1，不返回数据
                    if (params.top < 1) {
                        return []
                    }
                    if (params.top > QUERY_DOCS_TOP) {
                        params.top = QUERY_DOCS_TOP   // 最多返回5000条数据
                    }
                }

                const query = {}
                if (_.has(params, "filters")) {
                    query.filters = params.filters
                }
                if (_.has(params, "fields")) {
                    query.fields = params.fields
                }
                if (_.has(params, "top")) {
                    query.top = params.top
                }
                if (_.has(params, "skip")) {
                    query.skip = params.skip
                }
                if (_.has(params, "sort")) {
                    query.sort = params.sort
                }
                const records = await this.find(objectName, query, userSession)
                return {
                    records
                }
            }
        },
        /**
         * @api {GET} /api/v1/rest/:objectName/:id 获取单条记录
         * @apiVersion 0.0.0
         * @apiName findOne
         * @apiGroup @steedos/service-rest
         * @apiParam {String} objectName 对象API Name，如：contracts
         * @apiParam {String} id 记录id，如：5e7d1b9b9c9d4400001d1b9b
         * @apiQuery {String} [fields] 字段名，如：'["name","description"]'
         * @apiSuccess {Object} record  记录信息
         * @apiSuccessExample {json} Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *       "_id": "5e7d1b9b9c9d4400001d1b9b",
         *       "name": "test",
         *       ...
         *     }
         * @apiErrorExample {json} Error-Response:
         *     HTTP/1.1 404 Error
         *     {
         *       "error": "Service 'rest.contracts' is not found.",
         *       "detail": {
         *         "code": "404",
         *         "type": "SERVICE_NOT_FOUND",
         *         "data": {
         *          "action": "rest.contracts"
         *         }
         *       }
         *     }
         */
        findOne: {
            rest: {
                method: "GET",
                path: "/:objectName/:id"
            },
            params: {
                objectName: { type: "string" },
                id: { type: "any" },
                fields: { type: 'string', optional: true },
            },
            async handler(ctx) {
                const { objectName, id, fields } = ctx.params
                const userSession = ctx.meta.user;
                const query = {}
                if (fields) {
                    query.fields = JSON.parse(fields)
                }
                return this.findOne(objectName, id, query, userSession)
            }
        },
        /**
         * @api {POST} /api/v1/rest/:objectName 新增记录
         * @apiVersion 0.0.0
         * @apiName insert
         * @apiGroup @steedos/service-rest
         * @apiParam {String} objectName 对象API Name，如：contracts
         * @apiBody {Object} doc 新增的内容，如：{ name: 'test', description: 'test' }
         * @apiSuccess {Object} record  新记录信息
         * @apiSuccessExample {json} Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *       "_id": "5e7d1b9b9c9d4400001d1b9b",
         *       "name": "test",
         *       ...
         *     }
         * @apiErrorExample {json} Error-Response:
         *     HTTP/1.1 404 Error
         *     {
         *       "error": "Service 'rest.contracts' is not found.",
         *       "detail": {
         *         "code": "404",
         *         "type": "SERVICE_NOT_FOUND",
         *         "data": {
         *          "action": "rest.contracts"
         *         }
         *       }
         *     }
         */
        insert: {
            rest: {
                method: "POST",
                path: "/:objectName"
            },
            params: {
                objectName: { type: "string" },
                doc: { type: "object" }
            },
            async handler(ctx) {
                const userSession = ctx.meta.user;
                const { objectName, doc } = ctx.params;
                const object = getObject(objectName)
                let data = '';
                if (_.isString(doc)) {
                    data = JSON.parse(doc);
                } else {
                    data = JSON.parse(JSON.stringify(doc));
                }
                if (userSession && (await object.getField('space'))) {
                    data.space = userSession.spaceId;
                }
                return this.insert(objectName, data, userSession)
            }
        },
        /**
         * @api {PUT} /api/v1/rest/:objectName/:id 更新记录
         * @apiVersion 0.0.0
         * @apiName update
         * @apiGroup @steedos/service-rest
         * @apiParam {String} objectName 对象API Name，如：contracts
         * @apiParam {String} id 记录id，如：5e7d1b9b9c9d4400001d1b9b
         * @apiBody {Object} doc 更新的内容，如：{ name: 'test', description: 'test' }
         * @apiSuccess {Object} record  新记录信息
         * @apiSuccessExample {json} Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *       "_id": "5e7d1b9b9c9d4400001d1b9b",
         *       "name": "test",
         *       ...
         *     }
         * @apiErrorExample {json} Error-Response:
         *     HTTP/1.1 404 Error
         *     {
         *       "error": "Service 'rest.contracts' is not found.",
         *       "detail": {
         *         "code": "404",
         *         "type": "SERVICE_NOT_FOUND",
         *         "data": {
         *          "action": "rest.contracts"
         *         }
         *       }
         *     }
         */
        update: {
            rest: {
                method: "PUT",
                path: "/:objectName/:id"
            },
            params: {
                objectName: { type: "string" },
                id: { type: "any" },
                doc: { type: "object" }
            },
            async handler(ctx) {
                const userSession = ctx.meta.user;
                const { objectName, id, doc } = ctx.params;
                let data = '';
                if (_.isString(doc)) {
                    data = JSON.parse(doc);
                } else {
                    data = JSON.parse(JSON.stringify(doc));
                }
                delete data.space;
                return this.update(objectName, id, data, userSession)
            }
        },
        /**
         * @api {DELETE} /api/v1/rest/:objectName/:id 删除记录
         * @apiVersion 0.0.0
         * @apiName delete
         * @apiGroup @steedos/service-rest
         * @apiParam {String} objectName 对象API Name，如：contracts
         * @apiParam {String} id 记录id，如：5e7d1b9b9c9d4400001d1b9b
         * @apiSuccess {Object} record  新记录信息
         * @apiSuccessExample {json} Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *       "deleted": true,
         *       "id": "5e7d1b9b9c9d4400001d1b9b",
         *     }
         * @apiErrorExample {json} Error-Response:
         *     HTTP/1.1 404 Error
         *     {
         *       "error": "Service 'rest.contracts' is not found.",
         *       "detail": {
         *         "code": "404",
         *         "type": "SERVICE_NOT_FOUND",
         *         "data": {
         *          "action": "rest.contracts"
         *         }
         *       }
         *     }
         */
        delete: {
            rest: {
                method: "DELETE",
                path: "/:objectName/:id"
            },
            params: {
                objectName: { type: "string" },
                id: { type: "any" }
            },
            async handler(ctx) {
                const userSession = ctx.meta.user;
                const { objectName, id } = ctx.params;
                const objectConfig = await getObject(objectName).getConfig()
                const enableTrash = objectConfig.enable_trash
                if (!enableTrash) {
                    await this.delete(objectName, id, userSession)
                } else {
                    const data = {
                        is_deleted: true,
                        deleted: new Date(),
                        deleted_by: userSession ? userSession.userId : null
                    }
                    await this.update(objectName, id, data, userSession)
                }
                return {
                    "deleted": true,
                    "id": id
                }
            }
        },

    },

    /**
     * Events
     */
    events: {

    },

    /**
     * Methods
     */
    methods: {
        find: {
            async handler(objectName, query, userSession) {
                const obj = this.getObject(objectName)
                if (objectName == 'users') {
                    return await obj.find(query)
                }
                return await obj.find(query, userSession)
            }
        },
        findOne: {
            async handler(objectName, id, query, userSession) {
                const obj = this.getObject(objectName)
                if (objectName == 'users') {
                    return await obj.findOne(id, query)
                }
                return await obj.findOne(id, query, userSession)
            }
        },
        insert: {
            async handler(objectName, doc, userSession) {
                const obj = this.getObject(objectName)
                return await obj.insert(doc, userSession)
            }
        },
        update: {
            async handler(objectName, id, doc, userSession) {
                const obj = this.getObject(objectName)
                return await obj.update(id, doc, userSession)
            }
        },
        delete: {
            async handler(objectName, id, userSession) {
                const obj = this.getObject(objectName)
                return await obj.delete(id, userSession)
            }
        },
    },

    /**
     * Service created lifecycle event handler
     */
    created() {
    },

    merged(schema) {
    },

    /**
     * Service started lifecycle event handler
     */
    async started() {

    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {

    }
};
