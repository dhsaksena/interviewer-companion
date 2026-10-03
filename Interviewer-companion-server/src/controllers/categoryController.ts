import { Request, Response, NextFunction } from "express";
import { CategoryService } from "../services/categoryService";


export class CategoryController
{
    private categoryService = new CategoryService();

    async getAllCategories(req: Request, res: Response, next: NextFunction)
    {
        try
        {
            const categories = await this.categoryService.getAllCategories();
            res.json(categories)
        }
        catch (error)
        {
            next(error)
        }
    }
}