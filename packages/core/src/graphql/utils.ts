import {
    GraphQLList,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLFloat,
    GraphQLBoolean,
    GraphQLNonNull
} from 'graphql';
var _ = require("underscore");
import { ObjectId } from 'mongodb';
var GraphQLJSON = require('graphql-type-json');

/** Maps basic creator field types to basic GraphQL types */
const BASIC_TYPE_MAPPING = {
    'text': GraphQLString,
    'textarea': GraphQLString,
    'html': GraphQLString,
    'select': GraphQLString,
    'url': GraphQLString,
    'email': GraphQLString,
    'date': GraphQLString,
    'datetime': GraphQLString,
    'number': GraphQLFloat,
    'currency': GraphQLFloat,
    'boolean': GraphQLBoolean
}

function convertFields(fields, knownTypes) {
    let objTypeFields = {};
    objTypeFields["_id"] = {
        type: GraphQLString
    }

    _.each(fields, function (v, k) {
        if (k.indexOf('.') > -1) {
            return;
        }

        if (!v.type) {
            console.error(`The field ${k} has no type property.`);
            return;
        }

        if (BASIC_TYPE_MAPPING[v.type]) {
            objTypeFields[k] = { type: BASIC_TYPE_MAPPING[v.type] }
        }

        else if ((v.type == 'lookup' || v.type == 'master_detail') && v.reference_to && _.isString(v.reference_to)) {
            let reference_to = v.reference_to;
            objTypeFields[k] = {
                type: knownTypes[reference_to],
                args: {},
                resolve: async function (source, args, context, info) {
                    let steedosSchema = context.steedosSchema;
                    let object = steedosSchema.getObject(reference_to);
                    return object.findOne(source[reference_to]);
                }
            };
            if (v.type == 'lookup' && v.multiple) {
                objTypeFields[k].type = new GraphQLList(knownTypes[reference_to]);
                objTypeFields[k].resolve = async function (source, args, context, info) {
                    let steedosSchema = context.steedosSchema;
                    let object = steedosSchema.getObject(reference_to);
                    let selector = { _id: { $in: source[reference_to] } };
                    return object.find(selector);
                }
            }
        }
        else {
            objTypeFields[k] = {
                type: GraphQLJSON,

            };
        }
    })

    return objTypeFields
}

function toArray(x: any | any[]): any[] {
    return x instanceof Array ? x : [x]
}

function correctName(name: string) {
    return name.replace(/\./g, '_');
}

export function makeGraphQLSchemaConfig(customObj: any | any[]) {
    let customObjArray = toArray(customObj);
    let rootQueryfields = {};
    let knownTypes = {};
    _.each(customObjArray, function (obj) {
        if (!obj.name) {
            return;
        }
        let objName = correctName(obj.name);
        knownTypes[objName] = new GraphQLObjectType({
            name: objName, fields: function () {
                return convertFields(obj.fields, knownTypes);
            }
        })
        console.log(knownTypes[objName]);
        rootQueryfields[objName] = {
            type: new GraphQLList(knownTypes[objName]),
            args: { 'selector': { type: GraphQLJSON }, 'options': { type: GraphQLJSON } },
            resolve: async function (source, args, context, info) {
                var selector = args['selector'] || {};
                let steedosSchema = context.steedosSchema;
                let object = steedosSchema.getObject(obj.name);
                console.log('graphql.find: ');
                return object.find(selector);
            }
        }
    })

    let rootMutationfields = {};
    _.each(knownTypes, function (type, objName) {
        rootMutationfields[objName + '_INSERT_ONE'] = {
            type: GraphQLJSON,
            args: { 'data': { type: new GraphQLNonNull(GraphQLJSON) } },
            resolve: async function (source, args, context, info) {
                console.log('args: ', args);
                var data = args['data'];
                data._id = data._id || new ObjectId().toHexString();
                let steedosSchema = context.steedosSchema;
                let object = steedosSchema.getObject(type.name);
                return object.insert(data);
            }
        }
        rootMutationfields[objName + '_UPDATE_ONE'] = {
            type: GraphQLJSON,
            args: { '_id': { type: new GraphQLNonNull(GraphQLString) }, 'selector': { type: GraphQLJSON }, 'data': { type: new GraphQLNonNull(GraphQLJSON) } },
            resolve: async function (source, args, context, info) {
                console.log('args: ', args);
                let data = args['data'];
                let _id = args['_id'];
                let steedosSchema = context.steedosSchema;
                let object = steedosSchema.getObject(type.name);
                return object.update(_id, data);
            }
        }
        rootMutationfields[objName + '_DELETE_ONE'] = {
            type: GraphQLJSON,
            args: { '_id': { type: new GraphQLNonNull(GraphQLString) }, 'selector': { type: GraphQLJSON } },
            resolve: async function (source, args, context, info) {
                console.log('args: ', args);
                let _id = args['_id'];
                let steedosSchema = context.steedosSchema;
                let object = steedosSchema.getObject(type.name);
                return object.delete(_id);
            }
        }
    })

    var schemaConfig = {
        query: new GraphQLObjectType({
            name: 'RootQueryType',
            fields: rootQueryfields
        }),
        mutation: new GraphQLObjectType({
            name: 'MutationRootType',
            fields: rootMutationfields
        })
    };

    return schemaConfig;
}

export function makeSchema(customObj: any | any[]) {
    return new GraphQLSchema(makeGraphQLSchemaConfig(customObj));
}