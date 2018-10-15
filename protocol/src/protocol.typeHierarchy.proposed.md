#### Type Hierarchy

The type hierarchy language feature provides type hierarchy information for languages supporting inheritance and nominal typing.

_Client Capabilities_:

```ts
/**
 * Client capabilities specific to the type hierarchy feature.
 */
export interface TypeHierarchyCapabilities {

  /**
   * The text document client capabilities.
   */
  textDocument?: {

    /**
     * Capabilities specific to the `textDocument/typeHierarchy`.
     */
    typeHierarchy?: {

      /**
       * Whether implementation supports dynamic registration. If this is set to `true`
       * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
       * return value for the corresponding server capability as well.
       */
      dynamicRegistration?: boolean;

    }

  }

}
```

_Server Capabilities_:

Capability whether the language server capability can provider type hierarchy information to the client.

```ts
/**
 * Type hierarchy language server capability.
 */
export interface TypeHierarchyServerCapabilities {

  /**
   * Server capability for calculating super- and subtype hierarchies.
   */
  typeHierarchyProvider?: boolean | (TextDocumentRegistrationOptions & StaticRegistrationOptions);

}
```

_Requests_:

The `Type Hierarchy Request` is sent from the client to the server to retrieve a `TypeHierarchyItem` at a given cursor position. If computing full type hierarchy items is expensive, servers can additionally provide a handler for the type hierarchy item resolve request (`typeHierarchy/resolve`). This request would also allow to specify if the item should be resolved and whether sub- or supertypes are to be resolved. If no item can be retrieved for a given text document position, returns with `null`.

#### Type Hierarchy Request:

 * method: `textDocument/typeHierarchy`
 * params: `TypeHierarchyParams`

```ts
/**
 * The type hierarchy params is an extension of the `TextDocumentPositionParams` with optional properties
 * which can be used to eagerly resolve the item when requesting from the server.
 */
export interface TypeHierarchyParams extends TextDocumentPositionParams {

  /**
   * The hierarchy levels to resolve. `0` indicates no level. When not defined, it is treated as `0`.
   */
  resolve?: number;

  /**
   * The direction of the hierarchy levels to resolve.
   */
  direction?: TypeHierarchyDirection

}

export namespace TypeHierarchyDirection {

  /**
   * Flag for retrieving/resolving the subtypes.
   */
  export const Children = 0;

  /**
   * Flag to use when retrieving/resolving the supertypes.
   */
  export const Parents = 1;

  /**
   * Flag for resolving both the super- and subtypes.
   */
  export const Both = 2;

}
export type TypeHierarchyDirection = 0 | 1 | 2;

/**
 * The `textDocument/typeHierarchy` request is sent from the client to the server to retrieve the type hierarchy
 * items from a given position of a text document. Can resolve the parentage information on demand.
 * If no item can be retrieved for a given text document position, returns with `null`.
 */
export namespace TypeHierarchyRequest {
  export const type = new RequestType<TypeHierarchyParams, TypeHierarchyItem | null, void, void>('textDocument/typeHierarchy');
}
```

#### Type Hierarchy Response:

  * result: `TypeHierarchyItem` | `null`

```ts
export interface TypeHierarchyItem {

  /**
   * The human readable name of the hierarchy item.
   */
  name: string;

  /**
   * Optional detail for the hierarchy item. It can be, for instance, the signature of a function or method.
   */
  detail?: string;

  /**
   * The kind of the hierarchy item. For instance, class or interface.
   */
  kind: SymbolKind;

  /**
   * `true` if the hierarchy item is deprecated. Otherwise, `false`. It is `false` by default.
   */
  deprecated?: boolean;

  /**
   * The URI of the text document where this type hierarchy item belongs to.
   */
  uri: string;

  /**
   * The range enclosing this type hierarchy item not including leading/trailing whitespace but everything else
   * like comments. This information is typically used to determine if the the clients cursor is inside the type
   * hierarchy item to reveal in the symbol in the UI.
   */
  range: Range;

  /**
   * The range that should be selected and revealed when this type hierarchy item is being picked, e.g the name
   * of a function. Must be contained by the the `range`.
   */
  selectionRange: Range;

  /**
   * If this type hierarchy item is resolved, it contains the direct parents. Could be empty if the item does
   * not have any direct parents. If not defined, the parents have not been resolved yet.
   */
  parents?: TypeHierarchyItem[];

  /**
   * If this type hierarchy item is resolved, it contains the direct children of the current item. Could be
   * empty if the item does not have any descendants. If not defined, the children have not been resolved.
   */
  children?: TypeHierarchyItem[];

  /**
   * An optional data field can be used to identify a type hierarchy item in a resolve request.
   */
  data?: any;
}
```

The `Resolve Type Hierarchy Request` is sent from the client to the server to resolve an _unresolved_ `TypeHierarchyItem`. A `TypeHierarchyItem` is considered to be _unresolved_, if both the `parents` and the `children` properties are not defined. If resolved and no `parents` or `children` are available then an empty array is used instead. This request can be used if computing full type hierarchy items is expensive. With this request the server can fill the sub- and supertypes.

If the `item` of the `ResolveTypeHierarchyItemParams` was already resolved, then the item will be resolved again, if a subsequent `typeHierarchy/resolve` is requested. This implies the followings:
 - If a hierarchy item has already the `parents` resolved and is asked to resolve its `children`, then the server will provide an item with the `children` resolved, **but** the `parents` won't be defined.
 - If a hierarchy item has already the `children` resolved with a `params.resolve = 2` value (the `children` of the `children` were also resolved) and is asked to resolve its `children` again with a `params.resolve = 1` value, then the server will provide an item with only one level of `children`.
 - If the item to resolve is invalid, the server will return with `null`. This can happen when the text document has been changed between the `textDocument/typeHierarchy` and the `typeHierarchy/resolve` requests and `item.range` and `item.selectionRange` are not valid anymore.

#### Resolve Type Hierarchy Request:

 * method: `typeHierarchy/resolve`
 * params: `TypeHierarchyParams`

```ts
/**
 * Parameters for the `typeHierarchy/resolve` request.
 */
export interface ResolveTypeHierarchyItemParams {

  /**
   * The item to resolve.
   */
  item: TypeHierarchyItem;

  /**
   * The hierarchy levels to resolve. `0` indicates no level.
   */
  resolve: number;

  /**
   * The direction of the hierarchy levels to resolve.
   */
  direction: TypeHierarchyDirection;
}

/**
 * The `typeHierarchy/resolve` request is sent from the client to the server to resolve a type hierarchy
 * item by resolving sub- and supertype information.
 */
export namespace ResolveTypeHierarchyRequest {
  export const type = new RequestType<ResolveTypeHierarchyItemParams, TypeHierarchyItem | null, void, void>('typeHierarchy/resolve');
}
```

#### Resolve Type Hierarchy Response:

  * result: `TypeHierarchyItem` | `null`