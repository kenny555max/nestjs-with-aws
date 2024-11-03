export class Pagination<T> {
    page: number;
    totalPages: number;
    totalElements: number;
    data: T[];
}

export const paginateQuery = async (
    queryBuilder: any,
    page: number,
    limit: number,
) => {
    const skip = (page - 1) * limit;
    queryBuilder = await queryBuilder.skip(skip).take(limit);
    const result = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(result[1] / limit);

    const paginationResponse = {
        data: result[0],
        currentPage: page,
        pageSize: limit,
        total: result[1],
        totalPages,
    };

    return paginationResponse;
};
