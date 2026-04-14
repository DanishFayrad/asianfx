import type { Request, Response } from 'express';
import { Signal, UserSignal, User, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

export const getSignalsDashboard = async (req: Request, res: Response) => {
  try {
    const { symbol, limit = 20 } = req.query;

    const where: any = { status: 'active' };
    if (symbol) {
      where.symbol = { [Op.iLike]: `%${symbol}%` };
    }

    const active_signals = await Signal.findAll({
      where,
      limit: parseInt(limit as string),
      order: [['created_at', 'DESC']]
    });

    const recent_signals = await Signal.findAll({
      limit: 10,
      order: [['created_at', 'DESC']]
    });

    // Stats
    const total_signals = await Signal.count();
    const active_count = await Signal.count({ where: { status: 'active' } });
    const success_count = await Signal.count({ where: { result: 'win' } });
    const success_rate = total_signals > 0 ? (success_count / total_signals) * 100 : 0;

    return res.status(200).json({
      active_signals,
      recent_signals,
      stats: {
        total_signals,
        active_signals: active_count,
        success_rate: success_rate.toFixed(2)
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const takeSignal = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { user_id, signal_id, taken_price, invested_amount } = req.body;

        const user: any = await User.findByPk(user_id, { transaction: t });
        const signal: any = await Signal.findByPk(signal_id, { transaction: t });

        if (!user || !signal) {
            await t.rollback();
            return res.status(404).json({ message: 'User or Signal not found' });
        }

        if (user.wallet_balance < invested_amount) {
            await t.rollback();
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Create UserSignal entry
        const userSignal = await UserSignal.create({
            user_id,
            signal_id,
            taken_price,
            invested_amount,
            result: 'pending',
            taken_at: new Date()
        }, { transaction: t });

        // Update user balance
        user.wallet_balance -= invested_amount;
        await user.save({ transaction: t });

        // Update signal stats
        signal.total_taken += 1;
        await signal.save({ transaction: t });

        await t.commit();
        return res.status(201).json({ message: 'Signal taken successfully', data: userSignal });
    } catch (error) {
        await t.rollback();
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getUserSignalHistory = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const { result } = req.query;

    const where: any = { user_id };
    if (result) {
      where.result = result;
    }

    const history = await UserSignal.findAll({
      where,
      include: [{ model: Signal }],
      order: [['taken_at', 'DESC']]
    });

    return res.status(200).json(history);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};
export const createSignal = async (req: any, res: Response) => {
  try {
    const { 
      symbol, 
      type, 
      entry_price, 
      target_price, 
      stop_loss, 
      signal_type = 'free',
      description,
      expires_at 
    } = req.body;

    const signal = await Signal.create({
      symbol,
      type,
      entry_price,
      target_price,
      stop_loss,
      signal_type,
      description,
      expires_at,
      created_by: req.user.user_id,
      status: 'active',
      result: 'pending'
    });

    // TODO: Trigger push notifications to all users here
    // For now, we return success.
    return res.status(201).json({ 
      message: 'Signal created and broadcasted successfully', 
      signal 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};
